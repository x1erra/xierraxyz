"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export const PullToRefresh = ({ children }: { children: React.ReactNode }) => {
    const [startPoint, setStartPoint] = useState<number>(0);
    const [pullChange, setPullChange] = useState<number>(0);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const pullThreshold = 140; // Pixels to pull down to trigger refresh
    const containerRef = useRef<HTMLDivElement>(null);

    const initTouch = (e: React.TouchEvent) => {
        setStartPoint(e.touches[0].clientY);
    };

    const touchMove = (e: React.TouchEvent) => {
        if (!containerRef.current || window.scrollY > 0 || refreshing) return;

        const pullDistance = e.touches[0].clientY - startPoint;
        if (pullDistance > 0) {
            // Add resistance
            setPullChange(Math.pow(pullDistance, 0.8));
        }
    };

    const endTouch = () => {
        if (refreshing) return;

        if (pullChange > pullThreshold) {
            setRefreshing(true);
            setPullChange(80); // Snap to loading position
            window.location.reload(); // Simple reload for now
        } else {
            setPullChange(0);
        }
    };

    // Reset loop if needed, but for reload we don't strictly need it. 
    // Kept simple for now.

    const style = {
        transform: `translateY(${pullChange}px)`,
        transition: refreshing ? 'transform 0.2s' : pullChange === 0 ? 'transform 0.3s ease-out' : 'none',
    };

    return (
        <div
            ref={containerRef}
            onTouchStart={initTouch}
            onTouchMove={touchMove}
            onTouchEnd={endTouch}
            className="min-h-full"
        >
            <div
                className="fixed top-0 left-0 w-full flex justify-center pt-8 z-0 pointer-events-none"
                style={{ opacity: Math.min(pullChange / pullThreshold, 1) }}
            >
                <div className={`p-2 rounded-full bg-zinc-900 border border-white/10 shadow-xl ${refreshing ? 'animate-spin' : ''}`}>
                    <Loader2 className="text-white" size={20} />
                </div>
            </div>

            <div style={style} className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};
