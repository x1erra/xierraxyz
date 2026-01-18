import { useEffect, useRef, useState } from 'react';
import { joinRoom } from 'trystero/nostr';

// Define the configuration for Trystero using Nostr (default, most reliable)
const config = {
    appId: 'xierra-theatre',
    relayUrls: [
        'wss://relay.damus.io',
        'wss://relay.snort.social',
        'wss://nos.lol',
        'wss://relay.primal.net'
    ]
};

export type SyncAction =
    | { type: 'PLAY' }
    | { type: 'PAUSE' }
    | { type: 'SEEK'; time: number }
    | { type: 'QUEUE_ADD'; url: string }
    | { type: 'QUEUE_REMOVE'; index: number }
    | { type: 'QUEUE_PLAY_NEXT' }
    | { type: 'SKIN_CHANGE'; skin: string };

export type ChatMessage = {
    sender: string;
    text: string;
    timestamp: number;
    id: string; // for React keys
};

export const useTheatre = (roomId: string, username: string) => {
    const [peers, setPeers] = useState<string[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [queue, setQueue] = useState<string[]>([]);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [roomState, setRoomState] = useState<any>(null); // For raw access if needed

    // Actions
    const sendMessageRef = useRef<(data: ChatMessage) => void>(null);
    const sendSyncRef = useRef<(data: SyncAction) => void>(null);

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
                console.log('Received sync action:', action);
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
            });

            room.onPeerLeave((peerId: any) => {
                console.log(`Peer ${peerId} left`);
                setPeers(prev => prev.filter(p => p !== peerId));
            });
        }

        return () => {
            if (room) room.leave();
        };
    }, [roomId]);

    const handleSyncAction = (action: SyncAction) => {
        console.log('[Theatre] handleSyncAction called with:', action);
        switch (action.type) {
            case 'PLAY':
                console.log('[Theatre] Setting isPlaying to true');
                setIsPlaying(true);
                break;
            case 'PAUSE':
                setIsPlaying(false);
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
                            console.log('[Theatre] Auto-playing first added video');
                            setIsPlaying(true);
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
                // We need to know the current queue to decide what to play next
                // But we can't reliably read 'queue' state here if it's stale in closure?
                // Actually, handleSyncAction is recreated if we use useCallback?
                // No, it's defined inside the hook, so it captures current scope.
                // Better approach: use a functional update for queue, and derive the next video from it.
                // BUT we can't update two states atomically easily without a reducer.
                // For now, let's trust the current 'queue' state from the closure if valid, 
                // OR use setQueue callback to determine next but trigger side effect via useEffect?
                // Simplest fix: perform read and writes sequentially.

                setQueue(currentQueue => {
                    const [next, ...rest] = currentQueue;
                    console.log('[Theatre] Playing next video:', next);

                    // Side effect: Update other states. 
                    // Note: This is still technically a side effect in render phase if interrupted, 
                    // but standard useState updates batch well. 
                    // The issue before was likely just concurrency or closure staleness.
                    // Let's force the update outside the return to be clearer.

                    if (next) {
                        // We found a video. Schedule its play.
                        // Using setTimeout to break out of the render phase of setQueue? 
                        // No, React batches.
                        setCurrentVideoUrl(next);
                        setIsPlaying(true);
                    } else {
                        setCurrentVideoUrl(null);
                        setIsPlaying(false);
                    }

                    return rest;
                });
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
        console.log('[Theatre] sendSync called with action:', action);
        // Always apply locally first (Optimistic UI) regarding of connection status
        handleSyncAction(action);

        if (sendSyncRef.current) {
            console.log('[Theatre] Broadcasting to peers');
            sendSyncRef.current(action);
        } else {
            console.warn('[Theatre] Trystero not connected, action applied locally only:', action.type);
        }
    };

    const setOnSyncEvent = (cb: (action: SyncAction) => void) => {
        onSyncEventRef.current = cb;
    };

    return {
        peers,
        messages,
        sendMessage,
        sendSync,
        setOnSyncEvent,
        // State
        queue,
        currentVideoUrl,
        isPlaying
    };
};
