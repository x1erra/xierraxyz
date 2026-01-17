"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function TheatreLanding() {
    const [roomName, setRoomName] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleCreate = () => {
        if (roomName.trim()) {
            let url = `/theatre/${encodeURIComponent(roomName.trim())}`;
            if (password.trim()) {
                url += `?pwd=${encodeURIComponent(password.trim())}`;
            }
            router.push(url);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0 opacity-50">
                {/* We can use the Starfield here as background too */}
            </div>

            <div className="z-10 bg-zinc-900/80 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full text-center">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-light mb-2 tracking-widest font-[family-name:var(--font-geist-mono)]"
                >
                    XIERRA THEATRE
                </motion.h1>
                <p className="text-zinc-400 mb-8 text-sm">Synchronized Viewing Experience</p>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Enter Room Name..."
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 transition-colors"
                    />

                    <input
                        type="password"
                        placeholder="Optional Password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 transition-colors"
                    />

                    <button
                        onClick={handleCreate}
                        className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors"
                    >
                        ENTER THEATRE
                    </button>
                </div>
            </div>
        </div>
    );
}
