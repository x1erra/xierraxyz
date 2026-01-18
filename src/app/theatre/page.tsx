"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Starfield from '@/components/Starfield';
import { Sparkles, Lock, ArrowRight } from 'lucide-react';

export default function TheatreLanding() {
    const [roomName, setRoomName] = useState('');
    const [password, setPassword] = useState('');
    const [isHovered, setIsHovered] = useState(false);
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
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-black text-white overflow-hidden font-sans">
            {/* Background Layers */}
            <div className="absolute inset-0 z-0">
                <Starfield />
                {/* Gradient Mesh Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black/0 to-transparent pointer-events-none" />
            </div>

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="z-10 relative group"
            >
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 p-12 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center justify-center gap-2 mb-4"
                        >
                            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                            <span className="text-xs font-bold tracking-[0.3em] text-cyan-400 uppercase">Immersive Sync</span>
                        </motion.div>

                        <h1 className="text-5xl md:text-6xl font-extralight tracking-tighter text-white mb-2 font-[family-name:var(--font-geist-mono)]">
                            XIERRA
                        </h1>
                        <h2 className="text-xl font-light tracking-[0.5em] text-zinc-400">THEATRE</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-zinc-500 ml-1">Room Name</label>
                            <input
                                type="text"
                                placeholder="e.g. movie-night"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 ml-1">
                                <Lock size={12} className="text-zinc-500" />
                                <label className="text-xs uppercase tracking-widest text-zinc-500">Access Code (Optional)</label>
                            </div>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono text-sm"
                            />
                        </div>

                        <button
                            onClick={handleCreate}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className="w-full relative group overflow-hidden bg-white text-black font-bold py-4 rounded-xl mt-4 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                CREATE ROOM <ArrowRight size={18} className={`transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                            </span>
                        </button>
                    </div>
                </div>

                <div className="text-center mt-6 text-zinc-600 text-xs tracking-widest uppercase">
                    P2P Encrypted • High Fidelity • Low Latency
                </div>
            </motion.div>
        </div>
    );
}
