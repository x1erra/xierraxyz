"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Starfield from '@/components/Starfield';
import { Sparkles } from 'lucide-react';

export default function TheatreLanding() {
    const router = useRouter();

    useEffect(() => {
        // Generate a random 6-digit room ID
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();

        // Immediate redirect
        router.replace(`/theatre/${roomId}`);
    }, [router]);

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-black text-white overflow-hidden font-sans">
            <Starfield />
            <div className="z-10 flex flex-col items-center gap-4">
                <div className="flex items-center justify-center gap-2 mb-4 animate-pulse">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span className="text-xs font-bold tracking-[0.3em] text-cyan-400 uppercase">Immersive Sync</span>
                </div>
                <div className="text-zinc-500 font-mono text-sm tracking-widest uppercase">
                    Assigning Room...
                </div>
            </div>
        </div>
    );
}
