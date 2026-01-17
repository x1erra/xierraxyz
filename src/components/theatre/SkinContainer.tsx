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
                </div>
            )}

            {variant === 'modern' && (
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
            )}

            {variant === 'traditional' && (
                <div className="absolute inset-0 z-0 bg-[#1a0505]" /> // Dark velvet red backing
            )}

            {/* Content Layer */}
            <div className={`relative z-10 w-full h-full flex flex-col ${variant === 'traditional' ? 'p-8' : ''}`}>

                {variant === 'traditional' && (
                    <>
                        {/* Top Curtain */}
                        <motion.div
                            initial={{ y: -100 }} animate={{ y: 0 }}
                            className="absolute top-0 left-0 right-0 h-32 bg-[#4a0a0a] z-20 shadow-2xl rounded-b-[50%] border-b-4 border-[#ffd700]"
                        />
                        {/* Side Curtains */}
                        <div className="absolute top-0 left-0 bottom-0 w-32 bg-[#4a0a0a] z-20 shadow-2xl skew-x-3 border-r-4 border-[#ffd700]" />
                        <div className="absolute top-0 right-0 bottom-0 w-32 bg-[#4a0a0a] z-20 shadow-2xl -skew-x-3 border-l-4 border-[#ffd700]" />

                        {/* Stage Floor */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#2a1a10] z-20 border-t-8 border-[#3d2616]" />
                    </>
                )}

                {/* Main Content Area */}
                <div className={`flex-1 relative z-10 flex ${variant === 'traditional' ? 'mx-32 my-12 border-4 border-[#ffd700] rounded-lg overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)]' : ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
