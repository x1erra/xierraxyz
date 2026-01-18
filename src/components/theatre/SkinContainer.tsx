"use client";

import { ReactNode } from 'react';
import Starfield from '../Starfield';
import { motion } from 'framer-motion';

type SkinVariant = 'traditional' | 'modern' | 'space';

interface SkinContainerProps {
    variant: SkinVariant;
    children: ReactNode;
}

export default function SkinContainer({ variant, children }: SkinContainerProps) {
    return (
        <div className="relative w-full h-screen overflow-hidden bg-black transition-colors duration-1000">
            {/* Background Layers */}
            {variant === 'space' && (
                <div className="absolute inset-0 z-0">
                    <Starfield />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/5 to-black border-none" />
                </div>
            )}

            {variant === 'modern' && (
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-neutral-950" />
                    {/* Metallic/Dark Mesh Gradient */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(17,24,39,1)_0%,_rgba(0,0,0,1)_100%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" />

                    {/* Subtle Neon Accents */}
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] mix-blend-screen" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[100px] mix-blend-screen" />
                </div>
            )}

            {variant === 'traditional' && (
                <div className="absolute inset-0 z-0 bg-[#2a0a0a]">
                    {/* Authentic Velvet Texture Pattern (CSS simulated) */}
                    <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/black-felt.png')]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)] opacity-80" />
                </div>
            )}

            {/* Content Layer */}
            <div className={`relative z-10 w-full h-full flex flex-col font-sans`}>

                {variant === 'traditional' && (
                    <>
                        {/* Top Curtain - Overlaps sides (z-60) */}
                        <motion.div
                            initial={{ y: -150 }} animate={{ y: -50 }}
                            className="absolute top-0 left-0 right-0 h-24 lg:h-48 z-[60] drop-shadow-2xl pointer-events-none"
                        >
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#5e0b0b_0px,#3d0404_40px,#5e0b0b_80px)] rounded-b-[50%_40%] shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-b-[6px] border-[#ffd700]" />
                            {/* Gold Fringe */}
                            <div className="absolute bottom-[-12px] left-0 right-0 h-3 border-t-[4px] border-dotted border-[#ffd700] opacity-80" />
                        </motion.div>

                        {/* Left Side Curtain (z-50) */}
                        <motion.div
                            initial={{ x: -100 }} animate={{ x: 0 }}
                            className="hidden lg:block absolute top-0 bottom-0 left-0 w-32 md:w-48 z-50 bg-[repeating-linear-gradient(90deg,#5e0b0b_0px,#3d0404_20px,#5e0b0b_40px)] shadow-[10px_0_50px_rgba(0,0,0,0.8)] border-r-4 border-[#b8860b] skew-x-1 origin-top-left pointer-events-none"
                        />

                        {/* Right Side Curtain (z-50) */}
                        <motion.div
                            initial={{ x: 100 }} animate={{ x: 0 }}
                            className="hidden lg:block absolute top-0 bottom-0 right-0 w-32 md:w-48 z-50 bg-[repeating-linear-gradient(90deg,#5e0b0b_0px,#3d0404_20px,#5e0b0b_40px)] shadow-[-10px_0_50px_rgba(0,0,0,0.8)] border-l-4 border-[#b8860b] -skew-x-1 origin-top-right pointer-events-none"
                        />

                        {/* Wooden Stage Floor Footer with Exit Link */}
                        <div className="hidden lg:flex absolute bottom-0 left-0 right-0 h-16 bg-[linear-gradient(180deg,#3e2723_0%,#281815_100%)] border-t-4 border-[#5d4037] shadow-[0_-10px_40px_rgba(0,0,0,0.9)] z-[70] items-center justify-between px-12">
                            <div className="text-[#ffd700] opacity-30 text-[10px] tracking-[1em] font-serif uppercase">Xierra Cinema Hall</div>

                            <div className="text-[#ffd700] opacity-30 text-[10px] tracking-[1em] font-serif uppercase hidden md:block">Est. 2024</div>
                        </div>
                    </>
                )}

                {/* Main Content Area */}
                {/* Content should overlap curtains in traditional mode, so we remove the specific padding */}
                <div className={`relative w-full h-full`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
