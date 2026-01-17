"use client";

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../hooks/useTheatre';
import { Send, MessageSquare } from 'lucide-react';

interface ChatProps {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    username: string;
}

export default function Chat({ messages, onSend, username }: ChatProps) {
    const [text, setText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (text.trim()) {
            onSend(text.trim());
            setText('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/80 backdrop-blur-md border-l border-white/10 w-80">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <MessageSquare size={16} className="text-zinc-400" />
                <h3 className="text-white font-bold tracking-wider text-sm">LIVE CHAT</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-zinc-600 text-xs mt-10">
                        Welcome to the room!
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.sender === username;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className={`text-[10px] font-bold ${isMe ? 'text-blue-400' : 'text-purple-400'}`}>
                                    {msg.sender}
                                </span>
                                <span className="text-[10px] text-zinc-600">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className={`px-3 py-2 rounded-lg text-sm max-w-[90%] break-words ${isMe
                                    ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30'
                                    : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-3 border-t border-white/10 bg-black/40">
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 focus-within:border-white/50 transition-colors">
                    <input
                        className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-zinc-500"
                        placeholder="Say something..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
