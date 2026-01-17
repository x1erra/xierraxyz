"use client";

import React, { use } from 'react';
import TheatreRoom from '@/components/theatre/TheatreRoom';

export default function RoomPage({
    params,
    searchParams
}: {
    params: Promise<{ roomId: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { roomId } = use(params);
    const { pwd } = use(searchParams);

    const password = typeof pwd === 'string' ? pwd : undefined;

    return <TheatreRoom roomId={roomId} password={password} />;
}
