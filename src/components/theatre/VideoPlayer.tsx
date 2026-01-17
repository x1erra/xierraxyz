"use client";

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { SyncAction } from '../../hooks/useTheatre';
import IdleScreen from './IdleScreen';

// Dynamic import to handle SSR and potentially fix type issues
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface VideoPlayerProps {
    url: string | null;
    isPlaying: boolean;
    onSync: (action: SyncAction) => void;
    syncTime?: number;
}

export default function VideoPlayer({ url, isPlaying, onSync, syncTime }: VideoPlayerProps) {
    const playerRef = useRef<any>(null);
    const [ready, setReady] = useState(false);
    const lastSyncTimeRef = useRef(0);

    // Sync effect: If network time drifts significantly from local time, seek.
    useEffect(() => {
        if (syncTime !== undefined && playerRef.current && ready) {
            const current = playerRef.current.getCurrentTime();
            if (Math.abs(current - syncTime) > 2) {
                console.log(`Syncing: Local ${current} -> Remote ${syncTime}`);
                playerRef.current.seekTo(syncTime, 'seconds');
            }
        }
    }, [syncTime, ready]);

    if (!url) {
        return <IdleScreen />;
    }

    return (
        <div className="w-full h-full bg-black relative">
            <ReactPlayer
                ref={playerRef}
                url={url}
                width="100%"
                height="100%"
                playing={isPlaying}
                onReady={() => setReady(true)}
                controls={true} // Allow local controls, which will trigger events

                onPlay={() => {
                    // Check if this was a user action or prop update?
                    // ReactPlayer fires onPlay when 'playing' prop becomes true too.
                    // Simple de-dupe: if isPlaying prop is already true, ignore? 
                    if (!isPlaying) onSync({ type: 'PLAY' });
                }}

                onPause={() => {
                    if (isPlaying) onSync({ type: 'PAUSE' });
                }}

                onProgress={(state: any) => {
                    // Check if we sought
                    // This is tricky with react-player. Usually easier to just set an interval in parent
                    // or rely on explicit onSeek if standard controls are used.
                    // For now, we rely on standard controls.
                }}

                onSeek={(seconds: any) => {
                    // This fires when user seeks via native controls
                    onSync({ type: 'SEEK', time: seconds });
                }}
            />
        </div>
    );
}
