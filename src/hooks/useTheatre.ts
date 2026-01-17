import { useEffect, useRef, useState } from 'react';
import { joinRoom } from 'trystero';

// Define the configuration for Trystero
const config = { appId: 'xierra-theatre' };

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
        const room = joinRoom(config, roomId);
        setRoomState(room);

        // Chat Action
        const [sendMsg, getMsg] = room.makeAction<ChatMessage>('chat');
        sendMessageRef.current = sendMsg;
        getMsg((data, peerId) => {
            setMessages(prev => [...prev, { ...data, sender: peerId }]); // simple sender ID for now
        });

        // Sync Action
        const [sendSync, getSync] = room.makeAction<SyncAction>('sync');
        sendSyncRef.current = sendSync;
        getSync((action, peerId) => {
            // Handle internal state updates
            handleSyncAction(action);
            // Notify consumer
            if (onSyncEventRef.current) {
                onSyncEventRef.current(action);
            }
        });

        // Peer Events
        room.onPeerJoin(peerId => {
            console.log(`Peer ${peerId} joined`);
            setPeers(prev => [...prev, peerId]);
            // Host logic: send current state to new peer? (TODO)
        });

        room.onPeerLeave(peerId => {
            console.log(`Peer ${peerId} left`);
            setPeers(prev => prev.filter(p => p !== peerId));
        });

        return () => {
            room.leave();
        };
    }, [roomId]);

    const handleSyncAction = (action: SyncAction) => {
        switch (action.type) {
            case 'PLAY':
                setIsPlaying(true);
                break;
            case 'PAUSE':
                setIsPlaying(false);
                break;
            case 'QUEUE_ADD':
                setQueue(q => [...q, action.url]);
                // If nothing playing, play this immediately (simple logic)
                setCurrentVideoUrl(prev => prev || action.url);
                break;
            case 'QUEUE_REMOVE':
                setQueue(q => q.filter((_, i) => i !== action.index));
                break;
            case 'QUEUE_PLAY_NEXT':
                setQueue(q => {
                    const [next, ...rest] = q;
                    setCurrentVideoUrl(next || null);
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
        if (!sendSyncRef.current) return;
        handleSyncAction(action); // Apply locally optimistically
        sendSyncRef.current(action);
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
