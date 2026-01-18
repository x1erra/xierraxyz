"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheatre, SyncAction } from '../../hooks/useTheatre';
import SkinContainer from './SkinContainer';
import VideoPlayer, { VideoPlayerHandle } from './VideoPlayer';
import VideoQueue from './VideoQueue';
import Chat from './Chat';
import { Monitor, Maximize, MessageSquareOff, Settings, Users, Link as LinkIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TheatreRoomProps {
    roomId: string;
    password?: string;
}

export default function TheatreRoom({ roomId, password }: TheatreRoomProps) {
    const [username] = useState(() => `User${Math.floor(Math.random() * 1000)}`);
    const effectiveRoomId = password ? `${roomId}-${password}` : roomId;
    const [isMobile, setIsMobile] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const videoPlayerRef = useRef<VideoPlayerHandle>(null);

    const getVideoTime = useCallback(() => {
        return videoPlayerRef.current?.getCurrentTime() ?? 0;
    }, []);

    const {
        messages, sendMessage, sendSync, setOnSyncEvent,
        peers, queue, currentVideoUrl, isPlaying, syncTime, requestState
    } = useTheatre(effectiveRoomId, username, getVideoTime);

    const [skin, setSkin] = useState<'traditional' | 'modern' | 'space'>('space');
    const [viewMode, setViewMode] = useState<'default' | 'fullscreen' | 'cinema'>('default');
    const [showChat, setShowChat] = useState(true);
    const [showQueue, setShowQueue] = useState(true);
    const [isSkinMenuOpen, setIsSkinMenuOpen] = useState(false);

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

    const getThemeFont = () => {
        switch (skin) {
            case 'traditional': return 'font-serif tracking-widest'; // Playfair via layout
            case 'space': return 'font-mono tracking-widest'; // Orbitron via layout (using mono variable usually or just font-family if mapped)
            default: return 'font-sans tracking-wide'; // Inter
        }
    };

    // Mapping fonts more explicitly if needed, assuming valid css variables:
    // font-playfair, font-inter, font-orbitron

    return (
        <div className={`w-full h-screen relative bg-black text-white overflow-hidden transition-all duration-500 
            ${skin === 'traditional' ? 'font-[family-name:var(--font-playfair)]' : ''}
            ${skin === 'modern' ? 'font-[family-name:var(--font-inter)]' : ''}
            ${skin === 'space' ? 'font-[family-name:var(--font-orbitron)]' : ''}
        `}>
            {/* View Mode: Fullscreen */}
            <AnimatePresence>
                {viewMode === 'fullscreen' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black"
                    >
                        <VideoPlayer
                            url={currentVideoUrl}
                            isPlaying={isPlaying}
                            onSync={handleSync}
                            syncTime={syncTime}
                        />
                        <div className="absolute top-8 right-8 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
                            <button onClick={() => setViewMode('default')} className="bg-black/50 hover:bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full border border-white/10 text-sm font-medium flex items-center gap-2 transition-all">
                                <Maximize size={14} /> Exit Fullscreen
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Standard Mode Container */}
            <div className={`relative w-full h-full transition-opacity duration-500 ${viewMode === 'fullscreen' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <SkinContainer
                    variant={skin}
                >

                    <div className="flex flex-col h-full relative">
                        {/* Toolbar - Flex Item - Elevated Z-Index for accessibility over curtains */}
                        <header className={`h-16 lg:h-24 flex-none flex items-center justify-between px-4 lg:px-8 z-[80] transition-all duration-500
                            ${skin === 'traditional' ? 'bg-gradient-to-b from-[#2a0505] to-transparent border-b border-[#ffd700]/10' : ''}
                            ${skin === 'modern' ? 'bg-gradient-to-b from-black/90 via-black/50 to-transparent' : ''}
                            ${skin === 'space' ? 'bg-gradient-to-b from-cyan-950/30 to-transparent' : ''}
                        `}>
                            {/* Left: Branding & Status */}
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <h1 className={`font-black uppercase text-white flex items-center gap-2 transition-all
                                        ${skin === 'traditional' ? 'text-lg italic tracking-[0.1em] text-[#ffd700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : ''}
                                        ${skin === 'modern' ? 'text-sm tracking-[0.3em] text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]' : ''}
                                        ${skin === 'space' ? 'text-xl tracking-[0.2em] text-cyan-200 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]' : ''}
                                    `}>
                                        <span>XIERRA</span>
                                        <span className="opacity-50 font-light">|</span>
                                        <span className="opacity-80 font-normal">{roomId}</span>
                                    </h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`h-1.5 w-1.5 rounded-full ${peers.length > 0 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-zinc-600"}`} />
                                        <span className="text-[9px] uppercase tracking-widest opacity-60 font-medium">
                                            {peers.length + 1} Connected
                                        </span>
                                        <button
                                            onClick={() => requestState()}
                                            className="ml-2 text-[9px] uppercase tracking-widest text-cyan-500 opacity-60 hover:opacity-100 hover:underline"
                                            title="Force re-sync with peers"
                                        >
                                            RESYNC
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Controls */}
                            <div className={`flex items-center gap-4 backdrop-blur-md rounded-2xl p-1.5 border shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-500
                                ${skin === 'traditional' ? 'bg-[#2a0505]/80 border-[#ffd700]/30 shadow-[#ffd700]/5' : ''}
                                ${skin === 'modern' ? 'bg-black/40 border-white/10' : ''}
                                ${skin === 'space' ? 'bg-cyan-950/20 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : ''}
                            `}>
                                {/* Theme Selector Dropdown */}
                                <div className="relative z-50">
                                    <button
                                        onClick={() => setIsSkinMenuOpen(!isSkinMenuOpen)}
                                        onBlur={() => setTimeout(() => setIsSkinMenuOpen(false), 200)}
                                        className={`flex items-center gap-2 text-xs uppercase tracking-wider font-medium py-2 px-3 rounded-lg transition-all border border-transparent
                                            ${skin === 'traditional' ? 'hover:bg-[#ffd700]/10 text-[#ffd700]' : ''}
                                            ${skin === 'modern' ? 'hover:bg-white/10 text-cyan-400' : ''}
                                            ${skin === 'space' ? 'hover:bg-cyan-500/10 text-cyan-200' : ''}
                                        `}
                                    >
                                        <Settings size={14} className={isSkinMenuOpen ? 'animate-spin-slow' : ''} />
                                        <span>{skin}</span>
                                    </button>

                                    <AnimatePresence>
                                        {isSkinMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                className={`absolute top-full right-0 mt-2 w-40 py-2 rounded-xl border backdrop-blur-xl shadow-xl overflow-hidden flex flex-col
                                                    ${skin === 'traditional' ? 'bg-[#2a0505]/95 border-[#ffd700]/30' : ''}
                                                    ${skin === 'modern' ? 'bg-zinc-900/95 border-white/10' : ''}
                                                    ${skin === 'space' ? 'bg-slate-900/95 border-cyan-500/30' : ''}
                                                `}
                                            >
                                                {['traditional', 'modern', 'space'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => {
                                                            handleSkinChange(s);
                                                            setIsSkinMenuOpen(false);
                                                        }}
                                                        className={`text-left px-4 py-2.5 text-xs uppercase tracking-widest transition-colors flex items-center gap-2
                                                            ${skin === s ? 'font-bold' : 'font-medium opacity-60 hover:opacity-100'}
                                                            ${skin === 'traditional' ? 'text-[#ffd700] hover:bg-[#ffd700]/10' : ''}
                                                            ${skin === 'modern' ? 'text-white hover:bg-white/10' : ''}
                                                            ${skin === 'space' ? 'text-cyan-200 hover:bg-cyan-500/20' : ''}
                                                        `}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${skin === s ? 'opacity-100' : 'opacity-0'} 
                                                            ${skin === 'traditional' ? 'bg-[#ffd700]' : 'bg-current'}
                                                        `} />
                                                        {s}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className={`w-px h-6 mx-2 ${skin === 'traditional' ? 'bg-[#ffd700]/20' : 'bg-white/10'}`} />

                                <button
                                    onClick={handleCopyLink}
                                    className={`p-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden active:scale-95 hover:bg-white/10 opacity-60 hover:opacity-100`}
                                    title="Copy Invite Link"
                                >
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity
                                        ${skin === 'traditional' ? 'bg-[#ffd700]/10' : 'bg-green-500/20'}
                                    `} />
                                    {copied ? (
                                        <Check size={16} className="text-green-500 relative z-10" />
                                    ) : (
                                        <LinkIcon size={16} className={`relative z-10 ${skin === 'traditional' ? 'text-[#ffd700]' : ''}`} />
                                    )}
                                </button>

                                <div className={`w-px h-6 mx-2 ${skin === 'traditional' ? 'bg-[#ffd700]/20' : 'bg-white/10'}`} />

                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setShowQueue(!showQueue)}
                                        className={`p-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden active:scale-95 ${!showQueue ? 'opacity-60 hover:bg-white/5' : 'bg-white/10 opacity-100 shadow-inner'}`}
                                        title="Toggle Queue"
                                    >
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${showQueue ? 'opacity-100' : ''}
                                            ${skin === 'traditional' ? 'bg-[#ffd700]/10' : 'bg-purple-500/20'}
                                        `} />
                                        <Monitor size={16} className={`relative z-10 ${skin === 'traditional' ? 'text-[#ffd700]' : ''}`} />
                                    </button>

                                    <button
                                        onClick={() => setShowChat(!showChat)}
                                        className={`p-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden active:scale-95 ${!showChat ? 'opacity-60 hover:bg-white/5' : 'bg-white/10 opacity-100 shadow-inner'}`}
                                        title="Toggle Chat"
                                    >
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${showChat ? 'opacity-100' : ''}
                                             ${skin === 'traditional' ? 'bg-[#ffd700]/10' : 'bg-cyan-500/20'}
                                        `} />
                                        <MessageSquareOff size={16} className={`relative z-10 ${skin === 'traditional' ? 'text-[#ffd700]' : ''}`} />
                                    </button>

                                    <button
                                        onClick={() => setViewMode('fullscreen')}
                                        className="p-2.5 rounded-xl transition-all duration-200 opacity-60 hover:opacity-100 hover:bg-white/10 group relative active:scale-95"
                                        title="Enter Fullscreen"
                                    >
                                        <Maximize size={16} className={`${skin === 'traditional' ? 'text-[#ffd700]' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Main Layout Area - Flex 1 */}
                        <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 px-4 pb-4 lg:px-6 lg:pb-6 min-h-0 overflow-y-auto lg:overflow-y-hidden">

                            {/* Sidebar Left: Queue */}
                            <AnimatePresence>
                                {showQueue && (
                                    <motion.div
                                        initial={{ width: 0, height: 0, opacity: 0, marginRight: 0, marginBottom: 0 }}
                                        animate={{
                                            width: isMobile ? "100%" : 320,
                                            height: isMobile ? "auto" : "100%",
                                            opacity: 1,
                                            marginRight: 0,
                                            marginBottom: isMobile ? 16 : 0
                                        }}
                                        exit={{
                                            width: isMobile ? "100%" : 0,
                                            height: 0,
                                            opacity: 0,
                                            marginRight: isMobile ? 0 : -24,
                                            marginBottom: 0
                                        }}
                                        className="flex-none overflow-hidden relative z-[70] w-full lg:w-auto h-auto lg:h-full order-2 lg:order-1"
                                    >
                                        <div className="w-full lg:w-80 h-96 lg:h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 backdrop-blur-xl">
                                            <VideoQueue
                                                queue={queue}
                                                onAdd={(url) => sendSync({ type: 'QUEUE_ADD', url })}
                                                onRemove={(index) => sendSync({ type: 'QUEUE_REMOVE', index })}
                                                onPlayNext={() => sendSync({ type: 'QUEUE_PLAY_NEXT' })}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Center Stage: Video */}
                            <motion.div layout className="flex-none lg:flex-1 w-full relative group min-h-[300px] lg:min-h-0 order-1 lg:order-2">
                                {/* Glow Effect */}
                                <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-700" />

                                <div className="relative w-full h-full aspect-video lg:aspect-auto bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5">
                                    <VideoPlayer
                                        ref={videoPlayerRef}
                                        url={currentVideoUrl}
                                        isPlaying={isPlaying}
                                        onSync={handleSync}
                                        syncTime={syncTime}
                                    />
                                </div>
                            </motion.div>

                            {/* Sidebar Right: Chat */}
                            <AnimatePresence>
                                {showChat && (
                                    <motion.div
                                        initial={{ width: 0, height: 0, opacity: 0, marginRight: 0, marginBottom: 0 }}
                                        animate={{
                                            width: isMobile ? "100%" : 320,
                                            height: isMobile ? "auto" : "100%",
                                            opacity: 1,
                                            marginLeft: 0,
                                            marginTop: isMobile ? 16 : 0
                                        }}
                                        exit={{
                                            width: isMobile ? "100%" : 0,
                                            height: 0,
                                            opacity: 0,
                                            marginLeft: isMobile ? 0 : -24,
                                            marginTop: 0
                                        }}
                                        className="flex-none overflow-hidden relative z-[70] w-full lg:w-auto h-auto lg:h-full order-3 lg:order-3"
                                    >
                                        <div className="w-full lg:w-80 h-96 lg:h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 backdrop-blur-xl">
                                            <Chat
                                                messages={messages}
                                                onSend={sendMessage}
                                                username={username}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                </SkinContainer>
            </div>
        </div>
    );
}
