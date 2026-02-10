import { useEffect, useRef, useState } from 'react';
import { joinRoom } from 'trystero/nostr';

// Define the configuration for Trystero using Nostr (default, most reliable)
const config = {
    appId: 'xierra-theatre',
    relayUrls: [
        'wss://relay.damus.io',
        'wss://relay.snort.social',
        'wss://nos.lol',
        'wss://relay.primal.net',
        'wss://relay.nostr.band',
        'wss://relay.zbd.gg',
        'wss://nostr.wine',
        'wss://relay.plebstr.com'
    ],
    rtcConfig: {
        iceServers: [
            // Google STUN (Standard)
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
            // OpenRelay (Free Tier) - Good for testing
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'stun:openrelay.metered.ca:80'
            },
            // Tencent (China/Asia fallback)
            { urls: 'stun:stun.qq.com:3478' }
        ]
    }
};

export type SyncAction =
    | { type: 'PLAY' }
    | { type: 'PAUSE' }
    | { type: 'SEEK'; time: number }
    | { type: 'QUEUE_ADD'; url: string }
    | { type: 'QUEUE_REMOVE'; index: number }
    | { type: 'QUEUE_PLAY_NEXT' }
    | { type: 'SKIN_CHANGE'; skin: string }
    | { type: 'QUEUE_CLEAR' }
    | { type: 'REQUEST_STATE' }
    | {
        type: 'SYNC_STATE';
        state: {
            queue: string[];
            currentVideoUrl: string | null;
            isPlaying: boolean;
            timestamp: number;
        }
    };

export type ChatMessage = {
    sender: string;
    text: string;
    timestamp: number;
    id: string; // for React keys
};

export const useTheatre = (roomId: string, username: string, getVideoTime?: () => number) => {
    const [peers, setPeers] = useState<string[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [queue, setQueue] = useState<string[]>([]);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [syncTime, setSyncTime] = useState(0);
    const [roomState, setRoomState] = useState<any>(null); // For raw access if needed

    // Refs for state access in callbacks
    const queueRef = useRef(queue);
    const currentVideoUrlRef = useRef(currentVideoUrl);
    const isPlayingRef = useRef(isPlaying);

    useEffect(() => {
        queueRef.current = queue;
    }, [queue]);

    useEffect(() => {
        currentVideoUrlRef.current = currentVideoUrl;
    }, [currentVideoUrl]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Keep getVideoTime fresh in a ref to avoid stale closures in listeners
    const getVideoTimeRef = useRef(getVideoTime);
    useEffect(() => {
        getVideoTimeRef.current = getVideoTime;
    }, [getVideoTime]);

    // Actions
    const sendMessageRef = useRef<(data: ChatMessage) => void>(null);
    const sendSyncRef = useRef<(data: SyncAction, peerId?: string) => void>(null);

    // Event callbacks (to be set by consumer)
    const onSyncEventRef = useRef<(action: SyncAction) => void>(null);

    useEffect(() => {
        if (!roomId) return;

        // Initialize Trystero Room
        let room: any;
        try {
            room = joinRoom(config, roomId);
            console.log('Trystero room joined:', roomId);
        } catch (error) {
            console.error('Failed to join Trystero room:', error);
            // Fallback: create a dummy room object so the UI doesn't crash?
            // For now, let's just log. If room is undefined, the next lines will throw.
            return;
        }
        setRoomState(room);

        if (room) {
            // Chat Action
            const [sendMsg, getMsg] = room.makeAction('chat');
            sendMessageRef.current = sendMsg;
            getMsg((data: any, peerId: any) => {
                setMessages(prev => [...prev, { ...data, sender: peerId }]);
            });

            // Sync Action
            const [sendSyncAction, getSync] = room.makeAction('sync');
            sendSyncRef.current = sendSyncAction;
            getSync((action: any, peerId: any) => {
                // Handle internal state updates
                // console.log('Received sync action:', action); // Too spammy for seek?
                handleSyncAction(action);
                // Notify consumer
                if (onSyncEventRef.current) {
                    onSyncEventRef.current(action);
                }
            });

            // Peer Events
            room.onPeerJoin((peerId: any) => {
                console.log(`Peer ${peerId} joined`);
                setPeers(prev => [...prev, peerId]);

                // AUTO-SYNC: Immediately push state to the new peer if we are the host/have content
                // This fixes the "Waiting for broadcast" issue if the Request isn't received
                if (queueRef.current.length > 0 || isPlayingRef.current) {
                    // Slight delay to ensure their listener is ready
                    setTimeout(() => {
                        console.log('[Theatre] Peer joined, auto-broadcasting state to', peerId);
                        const currentTime = getVideoTimeRef.current ? getVideoTimeRef.current() : 0;
                        const stateBlock = {
                            queue: queueRef.current,
                            currentVideoUrl: currentVideoUrlRef.current,
                            isPlaying: isPlayingRef.current,
                            timestamp: currentTime
                        };

                        if (sendSyncRef.current) {
                            sendSyncRef.current({
                                type: 'SYNC_STATE',
                                state: stateBlock
                            }); // Broadcast to all (simplest) to ensure consensus
                        }
                    }, 500);
                }
            });

            room.onPeerLeave((peerId: any) => {
                console.log(`Peer ${peerId} left`);
                setPeers(prev => prev.filter(p => p !== peerId));
            });

            // On join, request state from peers (Keep this as backup Pull method)
            setTimeout(() => {
                console.log('[Theatre] Requesting state from peers...');
                sendSyncAction({ type: 'REQUEST_STATE' });
            }, 1000);
        }

        return () => {
            if (room) room.leave();
        };
    }, [roomId]);

    const handleSyncAction = (action: SyncAction) => {
        // console.log('[Theatre] handleSyncAction called with:', action.type);
        switch (action.type) {
            case 'PLAY':
                console.log('[Theatre] Setting isPlaying to true');
                setIsPlaying(true);
                break;
            case 'PAUSE':
                setIsPlaying(false);
                break;
            case 'SEEK':
                console.log('[Theatre] SEEK to:', action.time);
                setSyncTime(action.time);
                break;
            case 'SYNC_STATE':
                console.log('[Theatre] Received SYNC_STATE from peer');
                // Only accept state if we are "behind" or joining? 
                // For simplified logic, always accept logic that claims to be state.
                setQueue(action.state.queue);
                setCurrentVideoUrl(action.state.currentVideoUrl);
                setIsPlaying(action.state.isPlaying);
                setSyncTime(action.state.timestamp);
                break;
            case 'QUEUE_ADD':
                console.log('[Theatre] QUEUE_ADD - adding URL:', action.url);
                // Calculate new queue state first
                setQueue(currentQueue => {
                    const newQueue = [...currentQueue, action.url];
                    console.log('[Theatre] New queue:', newQueue);

                    // Logic to auto-play if nothing is currently playing
                    // We must check the *current* state of currentVideoUrl, not inside this callback ideally.
                    // However, to ensure we catch the empty case:
                    setCurrentVideoUrl(currentUrl => {
                        if (!currentUrl) {
                            console.log('[Theatre] First video added, setting to PAUSED state');
                            setIsPlaying(false);
                            return action.url;
                        }
                        return currentUrl;
                    });

                    return newQueue;
                });
                break;
            case 'QUEUE_REMOVE':
                setQueue(q => q.filter((_, i) => i !== action.index));
                break;
            case 'QUEUE_PLAY_NEXT':
                console.log('[Theatre] QUEUE_PLAY_NEXT called');
                setQueue(currentQueue => {
                    const [next, ...rest] = currentQueue;
                    console.log('[Theatre] Playing next video:', next);

                    if (next) {
                        setCurrentVideoUrl(next);
                        setIsPlaying(true);
                    } else {
                        setCurrentVideoUrl(null);
                        setIsPlaying(false);
                    }

                    return rest;
                });
                break;
            case 'SKIN_CHANGE':
                // Handled by consumer via onSyncEvent
                break;
            case 'QUEUE_CLEAR':
                console.log('[Theatre] Clearing queue');
                setQueue([]);
                break;
            case 'REQUEST_STATE':
                console.log('[Theatre] Received REQUEST_STATE');
                // Only send state if we are "hosting" content (playing or have queue)
                // This prevents empty states from overwriting meaningful ones if race conditions occur,
                // though usually only one person has content initially. 
                // Better: if we have *something*, share it.
                if (queueRef.current.length > 0 || isPlayingRef.current) {
                    const currentTime = getVideoTimeRef.current ? getVideoTimeRef.current() : 0;
                    const stateBlock = {
                        queue: queueRef.current,
                        currentVideoUrl: currentVideoUrlRef.current,
                        isPlaying: isPlayingRef.current,
                        timestamp: currentTime
                    };
                    console.log('[Theatre] Sending SYNC_STATE response:', stateBlock);
                    // Broadcast to everyone (simplest) or could target sender if action had senderId
                    // Since 'action' in Trystero doesn't include metadata in the payload unless we add it,
                    // we'll broadcast. It acts as a "State Update" for everyone which is fine.
                    if (sendSyncRef.current) {
                        sendSyncRef.current({
                            type: 'SYNC_STATE',
                            state: stateBlock
                        });
                    }
                }
                break;
        }
    };

    const sendMessage = (text: string) => {
        if (!sendMessageRef.current) return;
        const msg: ChatMessage = {
            sender: username, // self
            text,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        };
        sendMessageRef.current(msg);
        setMessages(prev => [...prev, msg]);
    };

    const sendSync = (action: SyncAction) => {
        // console.log('[Theatre] sendSync called with action:', action.type);
        // Always apply locally first (Optimistic UI) regarding of connection status
        handleSyncAction(action);

        if (sendSyncRef.current) {
            // console.log('[Theatre] Broadcasting to peers');
            sendSyncRef.current(action);
        } else {
            console.warn('[Theatre] Trystero not connected, action applied locally only:', action.type);
        }
    };

    const setOnSyncEvent = (cb: (action: SyncAction) => void) => {
        onSyncEventRef.current = cb;
    };

    const requestState = () => {
        console.log('[Theatre] Manually requesting state');
        sendSync({ type: 'REQUEST_STATE' });
    };

    return {
        peers,
        messages,
        sendMessage,
        sendSync,
        setOnSyncEvent,
        requestState,
        // State
        queue,
        currentVideoUrl,
        isPlaying,
        syncTime
    };
};
