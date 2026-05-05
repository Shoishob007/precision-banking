'use client';

import React, { useEffect, useState } from 'react';
import { API_REQUEST_STARTED_EVENT, API_REQUEST_ENDED_EVENT } from '@/lib/api';

export default function GlobalRequestIndicator() {
    const [pendingRequests, setPendingRequests] = useState(0);

    useEffect(() => {
        const onStart = () => setPendingRequests((count) => count + 1);
        const onEnd = () => setPendingRequests((count) => Math.max(0, count - 1));

        window.addEventListener(API_REQUEST_STARTED_EVENT, onStart);
        window.addEventListener(API_REQUEST_ENDED_EVENT, onEnd);

        return () => {
            window.removeEventListener(API_REQUEST_STARTED_EVENT, onStart);
            window.removeEventListener(API_REQUEST_ENDED_EVENT, onEnd);
        };
    }, []);

    if (pendingRequests === 0) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-transparent">
            <div className="h-full w-1/3 animate-[request-slide_1s_ease-in-out_infinite] bg-gradient-to-r from-primary to-secondary" />
        </div>
    );
}
