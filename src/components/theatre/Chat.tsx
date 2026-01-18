"use client";

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../hooks/useTheatre';
import { Send, MessageSquare, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatProps {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    username: string;
}

export default function Chat({ messages, onSend, username }: ChatProps) {
    const [text, setText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
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
        <div className="flex flex-col h-full bg-zinc-900/95 backdrop-blur-2xl border-l border-white/10 w-full h-full shadow-2xl font-sans">
            {/* Header */}
            <div className="flex-none p-5 border-b border-white/5 bg-gradient-to-l from-black/40 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-cyan-400">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                        <MessageSquare size={18} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold tracking-wide text-xs uppercase">Live Chat</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                            <span className="text-[9px] text-zinc-500 font-medium tracking-wider">ONLINE</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent bg-[url('/noise.svg')] bg-repeat opacity-95" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-40">
                        <MessageSquare size={32} className="mb-3" />
                        <span className="text-xs font-medium tracking-[0.2em] uppercase">Room Quiet</span>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => {
                        const isMe = msg.sender === username;
                        const isContinuation = i > 0 && messages[i - 1].sender === msg.sender;

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, x: isMe ? 20 : -20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isContinuation ? '-mt-2' : ''}`}
                            >
                                {!isContinuation && (
                                    <div className="flex items-center gap-2 mb-1.5 opacity-70 px-1">
                                        <span className={`text-[10px] font-bold tracking-wider uppercase ${isMe ? 'text-cyan-400' : 'text-purple-400'}`}>
                                            {isMe ? 'You' : msg.sender}
                                        </span>
                                        <span className="text-[9px] text-zinc-600 font-mono">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}

                                <div className={`relative px-4 py-2.5 text-sm max-w-[90%] break-words shadow-lg backdrop-blur-md border ${isMe
                                    ? 'bg-gradient-to-br from-cyan-600/20 to-blue-600/20 text-cyan-50 border-cyan-500/20 rounded-2xl rounded-tr-none shadow-[0_4px_15px_-5px_rgba(8,145,178,0.2)]'
                                    : 'bg-zinc-800/60 text-zinc-200 border-white/5 rounded-2xl rounded-tl-none shadow-[0_4px_15px_-5px_rgba(0,0,0,0.3)]'
                                    }`}>
                                    {msg.text}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="flex-none p-5 border-t border-white/10 bg-black/60 backdrop-blur-xl">
                <div className={`relative flex items-center gap-2 bg-zinc-900/80 border rounded-2xl p-2 transition-all duration-300 ${isFocused ? 'border-cyan-500/50 shadow-[0_0_20px_-5px_rgba(6,182,212,0.15)]' : 'border-white/10 hover:border-white/20'}`}>
                    <button className="p-2 text-zinc-500 hover:text-cyan-400 transition-colors rounded-xl hover:bg-white/5">
                        <Smile size={18} />
                    </button>

                    <input
                        className="flex-1 bg-transparent text-white text-base focus:outline-none placeholder-zinc-600 font-medium h-full py-2"
                        placeholder="Type a message..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />

                    <button
                        onClick={handleSend}
                        className={`p-2 rounded-xl transition-all duration-300 ${text.trim()
                            ? 'bg-cyan-500 text-black transform hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                            : 'bg-white/5 text-zinc-600 hover:bg-white/10'
                            }`}
                    >
                        <Send size={16} fill={text.trim() ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>
        </div>
    );
}
