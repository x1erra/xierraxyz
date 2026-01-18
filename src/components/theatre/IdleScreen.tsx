"use client";

import { motion } from 'framer-motion';
import Starfield from '../Starfield';

export default function IdleScreen() {
    return (
        <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
            <div className="absolute inset-0 z-0">
                <Starfield />
            </div>
            <motion.div
                animate={{ opacity: [0.6, 0.9, 0.6], y: [0, -15, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="z-10 text-center space-y-4"
            >
                <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-geist-mono)] text-white tracking-[0.3em] font-extralight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    XIERRA
                </h1>
                <p className="text-white/40 tracking-[0.5em] text-sm uppercase">Waiting for broadcast</p>

                <div className="flex justify-center mt-8">
                    <div className="flex space-x-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{ height: [10, 30, 10], opacity: [0.3, 0.7, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
                                className="w-1 bg-gradient-to-t from-cyan-500 to-transparent rounded-full"
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
