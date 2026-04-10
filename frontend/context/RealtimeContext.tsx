'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Account, Transaction } from '@/types';

const REALTIME_ENABLED =
    process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true' ||
    API_BASE_URL.includes('localhost');

export interface TransactionCreatedPayload {
    transaction: Transaction;
}

export interface BalanceUpdatedPayload {
    account: Account;
}

export interface TransactionFailedPayload {
    transaction: Transaction;
    reason: string;
}

interface RealtimeContextType {
    socket: Socket | null;
}

const RealtimeContext = createContext<RealtimeContextType>({ socket: null });

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const { token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (!token || !REALTIME_ENABLED) {
            setSocket(null);
            return;
        }

        const newSocket = io(API_BASE_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
            setSocket(null);
        };
    }, [token]);

    return (
        <RealtimeContext.Provider value={{ socket }}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    return useContext(RealtimeContext);
}
