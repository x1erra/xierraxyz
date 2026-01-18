"use client";

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import { SyncAction } from '../../hooks/useTheatre';
import IdleScreen from './IdleScreen';

// Dynamic import to handle SSR and potentially fix type issues
const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false }) as any;

interface VideoPlayerProps {
    url: string | null;
    isPlaying: boolean;
    onSync: (action: SyncAction) => void;
    syncTime?: number;
    muted?: boolean;
}

export interface VideoPlayerHandle {
    getCurrentTime: () => number;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({ url, isPlaying, onSync, syncTime }, ref) => {
    const playerRef = useRef<any>(null);
    const [ready, setReady] = useState(false);
    const lastSyncTimeRef = useRef(0);

    useImperativeHandle(ref, () => ({
        getCurrentTime: () => {
            if (playerRef.current) {
                return playerRef.current.getCurrentTime();
            }
            return 0;
        }
    }));

    // Sync effect: If network time drifts significantly from local time, seek.
    useEffect(() => {
        if (syncTime !== undefined && playerRef.current && ready) {
            const current = playerRef.current.getCurrentTime();
            if (Math.abs(current - syncTime) > 2) {
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
                controls={true} // Allow local controls
                muted={true} // MUST be true for autoplay to work on most browsers (especially mobile)
                playsinline={true} // Critical for iOS mobile playback

                // Error handling for autoplay blocks
                onError={(e: any) => {
                    // If error is related to autoplay, we might validly want to pause
                    // But for now just log it.
                }}

                onPlay={() => {
                    // Only trigger sync if we are NOT already supposed to be playing
                    // This prevents loops where incoming sync sets isPlaying=true, player plays, fires onPlay, sends sync...
                    if (!isPlaying) {
                        console.log('User pressed Play, sending sync');
                        onSync({ type: 'PLAY' });
                    }
                }}

                onPause={() => {
                    // Only trigger sync if we ARE supposed to be playing
                    if (isPlaying) {
                        console.log('User pressed Pause, sending sync');
                        onSync({ type: 'PAUSE' });
                    }
                }}

                onProgress={(state: { playedSeconds: number }) => {
                    // Detect Sync/Seek via progress jumps
                    const currentSeconds = state.playedSeconds;
                    const prevSeconds = lastSyncTimeRef.current;
                    const diff = Math.abs(currentSeconds - prevSeconds);

                    // If progress jumps by more than 2 seconds (given 1s interval), assume seek
                    // Also ensure we are ready and not just starting
                    if (ready && diff > 2) {
                        // To avoid spamming seek on initial load or sync events, maybe check time?
                        // But simple diff check is usually enough if 'ready' is true.
                        onSync({ type: 'SEEK', time: currentSeconds });
                    }

                    lastSyncTimeRef.current = currentSeconds;
                }}

            // onSeek removed to prevent "Unknown event handler" error props spreading to DOM
            // react-player sometimes passes this through if not consumed by internal player

            />
        </div>
    );
});

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
