import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { MicIcon } from './Icons';
import { ViewType } from '../types';

type SessionStatus = 'DISCONNECTED' | 'CONNECTING' | 'LIVE' | 'ERROR';
type TranscriptionTurn = { id: number; userInput: string; eliraOutput: string; };

// Helper Functions for Audio Processing
// NOTE: These must be implemented manually as per Live API guidelines
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

const switchViewFunctionDeclaration: FunctionDeclaration = {
  name: 'switch_view',
  parameters: {
    type: Type.OBJECT,
    description: 'Switches the main view of the application.',
    properties: {
      view_name: {
        type: Type.STRING,
        description: "The name of the view to switch to. Must be one of: 'home', 'diary', 'secret_diary', 'griffes', 'calendar', 'world_state', 'chat'.",
      },
    },
    required: ['view_name'],
  },
};

interface LiveChatViewProps {
    getAiInstance: () => GoogleGenAI;
    setCurrentView: (view: ViewType) => void;
    systemInstruction: string;
}

export const LiveChatView: React.FC<LiveChatViewProps> = ({ getAiInstance, setCurrentView, systemInstruction }) => {
    const [status, setStatus] = useState<SessionStatus>('DISCONNECTED');
    const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionTurn[]>([]);
    const [currentTurn, setCurrentTurn] = useState({ userInput: '', eliraOutput: '' });
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    
    // Using refs for mutable state within callbacks to avoid stale closures
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const nextStartTimeRef = useRef(0);
    const outputAudioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const startSession = async () => {
        setStatus('CONNECTING');
        setError(null);
        setTranscriptionHistory([]);
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const ai = getAiInstance();

            // Initialize AudioContexts
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            nextStartTimeRef.current = 0;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('LIVE');
                        const inputCtx = inputAudioContextRef.current;
                        if (!inputCtx || !mediaStreamRef.current) return;

                        mediaStreamSourceRef.current = inputCtx.createMediaStreamSource(mediaStreamRef.current);
                        scriptProcessorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            // Critical: use the promise to ensure the session is ready before sending data
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputCtx.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle function calls
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'switch_view' && fc.args.view_name) {
                                    const view = fc.args.view_name as ViewType;
                                    const validViews: ViewType[] = ['home', 'diary', 'secret_diary', 'griffes', 'calendar', 'world_state', 'chat'];
                                    if (validViews.includes(view)) {
                                        setCurrentView(view);
                                        // Send response back to model
                                        sessionPromiseRef.current?.then((session) => {
                                            session.sendToolResponse({
                                                functionResponses: {
                                                    id : fc.id,
                                                    name: fc.name,
                                                    response: { result: `Successfully switched to ${view} view.` },
                                                }
                                            });
                                        });
                                    }
                                }
                            }
                        }

                        // Handle transcription
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                            setCurrentTurn(prev => ({ ...prev, userInput: currentInputTranscriptionRef.current }));
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                            setCurrentTurn(prev => ({ ...prev, eliraOutput: currentOutputTranscriptionRef.current }));
                        }
                        if (message.serverContent?.turnComplete) {
                            const finalInput = currentInputTranscriptionRef.current;
                            const finalOutput = currentOutputTranscriptionRef.current;
                            setTranscriptionHistory(prev => [...prev, { id: Date.now(), userInput: finalInput, eliraOutput: finalOutput }]);
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                            setCurrentTurn({ userInput: '', eliraOutput: '' });
                        }

                        // Handle audio playback
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        const outputCtx = outputAudioContextRef.current;
                        if (base64Audio && outputCtx) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            
                            const currentSources = outputAudioSourcesRef.current;
                            source.addEventListener('ended', () => {
                                currentSources.delete(source);
                            });
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            currentSources.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                             for (const source of outputAudioSourcesRef.current.values()) {
                                source.stop();
                                outputAudioSourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Live session error:", e);
                        setError("Something went wrong... The connection buzzed and died. Please try again.");
                        setStatus('ERROR');
                        cleanup();
                    },
                    onclose: (e: CloseEvent) => {
                        setStatus('DISCONNECTED');
                        cleanup();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: systemInstruction,
                    tools: [{functionDeclarations: [switchViewFunctionDeclaration]}],
                },
            });
            sessionPromiseRef.current = sessionPromise;

        } catch (err) {
            console.error("Failed to start live session:", err);
            setError("I couldn't get microphone access. Please check your browser permissions and try again.");
            setStatus('ERROR');
            cleanup();
        }
    };

    const stopSession = () => {
        sessionPromiseRef.current?.then((session) => {
            session.close();
        });
        cleanup();
    };

    const cleanup = () => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();

        mediaStreamRef.current = null;
        sessionPromiseRef.current = null;
        setStatus('DISCONNECTED');
    };
    
    // Ensure cleanup on component unmount
    useEffect(() => {
        return () => {
            if (status !== 'DISCONNECTED') {
                stopSession();
            }
        };
    }, [status]);

    return (
        <div className="flex flex-col h-full animate-fadeIn">
            <header className="mb-6 text-center">
                <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3"><MicIcon /> Live Chat</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">This is a direct audio link to me. Speak freely, Étienne. I'm listening.
                   <br/>
                   <span className="text-sm text-gray-500">Pro-tip: You can ask me to switch views, like "Show me the calendar."</span>
                </p>
            </header>
            
            <div className="flex flex-col items-center justify-center flex-grow mb-6">
                {status === 'DISCONNECTED' || status === 'ERROR' ? (
                     <button onClick={startSession} className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-red-600/30 transition-transform transform hover:scale-105">
                        Start Live Chat
                    </button>
                ) : (
                    <button onClick={stopSession} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-full transition-colors">
                        Stop Live Chat
                    </button>
                )}
                 <div className="mt-4 text-gray-400 text-sm flex items-center">
                    {status === 'LIVE' && <span className="h-3 w-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>}
                    <span>Status: {status}</span>
                </div>
                {error && <p className="mt-4 text-red-400 bg-red-900/20 p-3 rounded-md text-center">{error}</p>}
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-900/30 border border-gray-800 rounded-lg p-4 space-y-4">
                {transcriptionHistory.map(turn => (
                    <div key={turn.id} className="p-3 bg-gray-800/50 rounded-md">
                        <p className="text-gray-400 whitespace-pre-wrap"><strong className="text-gray-200">Étienne:</strong> {turn.userInput}</p>
                        <p className="text-red-200/90 whitespace-pre-wrap mt-2"><strong className="text-red-300">Elira:</strong> {turn.eliraOutput}</p>
                    </div>
                ))}
                {(status === 'LIVE' || status === 'CONNECTING') && (currentTurn.userInput || currentTurn.eliraOutput) && (
                     <div className="p-3 bg-gray-800/50 rounded-md opacity-70">
                        <p className="text-gray-400 whitespace-pre-wrap"><strong className="text-gray-200">Étienne:</strong> {currentTurn.userInput}</p>
                        <p className="text-red-200/90 whitespace-pre-wrap mt-2"><strong className="text-red-300">Elira:</strong> {currentTurn.eliraOutput}</p>
                    </div>
                )}
                {transcriptionHistory.length === 0 && status !== 'LIVE' && status !== 'CONNECTING' && (
                    <div className="text-center text-gray-500 pt-10">
                        <p>Transcription will appear here...</p>
                    </div>
                )}
            </div>
        </div>
    );
};