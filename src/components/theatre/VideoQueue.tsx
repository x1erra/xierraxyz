"use client";

import { useState } from 'react';
import { Plus, X, Play, ListVideo, Link as LinkIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoQueueProps {
    queue: string[];
    onAdd: (url: string) => void;
    onRemove: (index: number) => void;
    onPlayNext: () => void;
    onClear: () => void;
}

export default function VideoQueue({ queue, onAdd, onRemove, onPlayNext, onClear }: VideoQueueProps) {
    const [url, setUrl] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const handleAdd = () => {
        if (url.trim()) {
            onAdd(url.trim());
            setUrl('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900/90 backdrop-blur-xl border-r border-white/10 w-full h-full shadow-2xl font-sans font-light select-none">
            {/* Header Section */}
            <div className="flex-none p-5 border-b border-white/5 bg-gradient-to-r from-black/40 to-transparent">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5 text-white">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <ListVideo size={18} />
                        </div>
                        <h3 className="text-white font-bold tracking-wide text-xs uppercase">Watch Queue</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {queue.length > 0 && (
                            <button
                                onClick={onClear}
                                className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 px-2 py-1 rounded transition-colors uppercase tracking-wider font-bold"
                                title="Clear entire queue"
                            >
                                Clear All
                            </button>
                        )}
                        <span className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded text-zinc-400 border border-white/5">
                            {queue.length} CLIPS
                        </span>
                    </div>
                </div>

                {/* Input Search Bar */}
                <div className={`relative group transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <LinkIcon size={14} className={`transition-colors ${isFocused ? 'text-white' : 'text-zinc-600'}`} />
                    </div>
                    <input
                        className="w-full bg-black/40 border border-white/10 text-white text-xs pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 transition-all placeholder-zinc-600 font-medium tracking-wide shadow-inner select-text"
                        placeholder="Paste YouTube, Vimeo, or generic MP4..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        className="absolute inset-y-0 right-2 my-1.5 px-2 bg-white/5 hover:bg-white text-zinc-500 hover:text-black rounded-lg transition-all border border-transparent hover:border-white/50"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {queue.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-600 opacity-50 border-2 border-dashed border-white/5 rounded-2xl mx-2">
                        <ListVideo size={32} className="mb-3 opacity-50" />
                        <span className="text-xs font-medium tracking-widest text-zinc-500">QUEUE EMPTY</span>
                    </div>
                )}

                <motion.ul
                    className="space-y-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.1
                            }
                        }
                    }}
                >
                    <AnimatePresence mode="popLayout">
                        {queue.map((item, i) => (
                            <motion.li
                                layout
                                variants={{
                                    hidden: { opacity: 0, y: 20, scale: 0.9 },
                                    visible: { opacity: 1, y: 0, scale: 1 }
                                }}
                                initial="hidden"
                                animate="visible"
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                key={`${item}-${i}`}
                                className="group relative flex items-center gap-3 bg-black/60 p-3.5 rounded-xl border border-white/5 hover:border-white/40 transition-all hover:bg-zinc-800/80 hover:shadow-[0_4px_20px_-5px_rgba(255,255,255,0.15)]"
                            >
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-800 to-black border border-white/5 flex items-center justify-center text-[10px] text-zinc-500 font-mono group-hover:text-white group-hover:border-white/30 transition-colors shadow-inner">
                                    {i + 1}
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                    <div className="text-xs text-zinc-200 truncate font-semibold group-hover:text-white transition-colors">
                                        {item}
                                    </div>
                                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-zinc-500/50" />
                                        External Video
                                    </div>
                                </div>

                                <button
                                    onClick={() => onRemove(i)}
                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 hover:bg-white/10 text-zinc-500 hover:text-white rounded-lg transition-all transform translate-x-2 group-hover:translate-x-0 focus:translate-x-0 border border-transparent hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
                                    title="Remove from queue"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </motion.ul>
            </div>

            {/* Footer Action */}
            {queue.length > 0 && (
                <div className="flex-none p-5 border-t border-white/10 bg-black/60 backdrop-blur-xl">
                    <button
                        onClick={onPlayNext}
                        className="w-full relative group overflow-hidden bg-white text-black font-bold py-3.5 rounded-xl text-sm transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10 flex items-center justify-center gap-2 group-hover:text-black transition-colors">
                            <Play size={16} fill="currentColor" />
                            PLAY NEXT
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
