"use client";

import { useState } from 'react';
import { Plus, X, Play } from 'lucide-react';

interface VideoQueueProps {
    queue: string[];
    onAdd: (url: string) => void;
    onRemove: (index: number) => void;
    onPlayNext: () => void;
}

export default function VideoQueue({ queue, onAdd, onRemove, onPlayNext }: VideoQueueProps) {
    const [url, setUrl] = useState('');

    const handleAdd = () => {
        if (url.trim()) {
            onAdd(url.trim());
            setUrl('');
        }
    };

    return (
        <div className="bg-zinc-900/90 backdrop-blur-sm border-l border-white/10 w-80 h-full flex flex-col">
            <div className="p-4 border-b border-white/10">
                <h3 className="text-white font-bold tracking-wider mb-2">QUEUE</h3>
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-black/50 border border-zinc-700 text-white text-xs px-2 rounded focus:outline-none focus:border-white/50"
                        placeholder="Paste Video URL..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button onClick={handleAdd} className="bg-white/10 hover:bg-white/20 text-white p-1 rounded">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {queue.length === 0 && <div className="text-zinc-500 text-xs italic text-center mt-10">Queue is empty</div>}

                {queue.map((item, i) => (
                    <div key={i} className="group flex items-center gap-2 bg-black/40 p-2 rounded text-xs text-zinc-300 border border-transparent hover:border-white/10">
                        <div className="flex-1 truncate">{item}</div>
                        <button onClick={() => onRemove(i)} className="opacity-0 group-hover:opacity-100 hover:text-red-400">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {queue.length > 0 && (
                <div className="p-4 border-t border-white/10">
                    <button onClick={onPlayNext} className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded text-sm transition-colors">
                        <Play size={16} /> Play Next
                    </button>
                </div>
            )}
        </div>
    );
}
