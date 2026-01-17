"use client";

import React, { useState, useEffect } from 'react';
import { useTheatre, SyncAction } from '../../hooks/useTheatre';
import SkinContainer from './SkinContainer';
import VideoPlayer from './VideoPlayer';
import VideoQueue from './VideoQueue';
import Chat from './Chat';
import { Monitor, Maximize, MessageSquareOff } from 'lucide-react';

interface TheatreRoomProps {
    roomId: string;
    password?: string;
}

export default function TheatreRoom({ roomId, password }: TheatreRoomProps) {
    // Generate a random username for now
    const [username] = useState(() => `User${Math.floor(Math.random() * 1000)}`);

    // Combine roomId and password for the actual Trystero room ID
    const effectiveRoomId = password ? `${roomId}-${password}` : roomId;

    const {
        messages, sendMessage, sendSync, setOnSyncEvent,
        peers, queue, currentVideoUrl, isPlaying
    } = useTheatre(effectiveRoomId, username);

    const [skin, setSkin] = useState<'traditional' | 'modern' | 'space'>('space');
    const [viewMode, setViewMode] = useState<'default' | 'fullscreen' | 'cinema'>('default');
    const [showChat, setShowChat] = useState(true);

    // Sync Event Listener for skin changes
    useEffect(() => {
        setOnSyncEvent((action) => {
            if (action.type === 'SKIN_CHANGE') {
                setSkin(action.skin as any);
            }
        });
    }, [setOnSyncEvent]);

    const handleSkinChange = (newSkin: string) => {
        setSkin(newSkin as any);
        sendSync({ type: 'SKIN_CHANGE', skin: newSkin });
    };

    const handleSync = (action: SyncAction) => {
        sendSync(action);
    };

    return (
        <div className="w-full h-screen relative bg-black text-white overflow-hidden">
            {viewMode === 'fullscreen' ? (
                // FULLSCREEN MODE: Video Only
                <div className="absolute inset-0 z-50">
                    <VideoPlayer
                        url={currentVideoUrl}
                        isPlaying={isPlaying}
                        onSync={handleSync}
                    // We would pass synced time here
                    />

                    {/* Floating Controls */}
                    <div className="absolute top-4 right-4 flex gap-2 z-50 opacity-0 hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewMode('default')} className="bg-black/50 p-2 rounded text-white">Exit Fullscreen</button>
                    </div>
                </div>
            ) : (
                // WRAPPED MODE
                <SkinContainer variant={skin}>

                    {/* Main Flex Layout */}
                    <div className="flex h-full w-full">

                        {/* Queue Sidebar (Collapsible?) - Left Side */}
                        {viewMode === 'default' && (
                            <div className="h-full z-20">
                                <VideoQueue
                                    queue={queue}
                                    onAdd={(url) => sendSync({ type: 'QUEUE_ADD', url })}
                                    onRemove={(index) => sendSync({ type: 'QUEUE_REMOVE', index })}
                                    onPlayNext={() => sendSync({ type: 'QUEUE_PLAY_NEXT' })}
                                />
                            </div>
                        )}

                        {/* Center Stage: Video */}
                        <div className="flex-1 h-full relative flex flex-col">
                            {/* Toolbar */}
                            <div className="h-12 bg-black/60 flex items-center justify-between px-4 border-b border-white/5 backdrop-blur z-20">
                                <div className="flex items-center gap-4">
                                    <span className="font-bold tracking-widest text-sm">ROOM: {roomId}</span>
                                    <span className="text-xs text-zinc-500">{peers.length + 1} users</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Skin Selectors */}
                                    <select
                                        className="bg-zinc-800 text-xs p-1 rounded border border-zinc-700"
                                        value={skin}
                                        onChange={(e) => handleSkinChange(e.target.value)}
                                    >
                                        <option value="traditional">Traditional</option>
                                        <option value="modern">Modern</option>
                                        <option value="space">Space</option>
                                    </select>

                                    {/* View Toggles */}
                                    <button onClick={() => setViewMode('fullscreen')} title="Fullscreen" className="p-1 hover:text-blue-400">
                                        <Maximize size={16} />
                                    </button>
                                    <button onClick={() => setShowChat(!showChat)} title="Toggle Chat" className={`p-1 hover:text-blue-400 ${!showChat ? 'text-zinc-600' : ''}`}>
                                        <MessageSquareOff size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Video Area */}
                            <div className="flex-1 relative bg-black">
                                <VideoPlayer
                                    url={currentVideoUrl}
                                    isPlaying={isPlaying}
                                    onSync={handleSync}
                                />
                            </div>
                        </div>

                        {/* Chat Sidebar - Right Side */}
                        {showChat && (
                            <div className="h-full z-20 border-l border-white/5">
                                <Chat
                                    messages={messages}
                                    onSend={sendMessage}
                                    username={username}
                                />
                            </div>
                        )}
                    </div>

                </SkinContainer>
            )}
        </div>
    );
}
