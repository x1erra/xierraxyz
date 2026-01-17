"use client";

import { motion } from 'framer-motion';
import Starfield from '../Starfield';

export default function IdleScreen() {
    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                <Starfield />
            </div>
            <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="z-10 text-center"
            >
                <h1 className="text-6xl font-[family-name:var(--font-geist-mono)] text-white/90 tracking-[0.5em] font-light">
                    XIERRA THEATRE
                </h1>
                <p className="text-white/40 mt-4 tracking-widest text-sm uppercase">Waiting for broadcast...</p>
            </motion.div>
        </div>
    );
}
