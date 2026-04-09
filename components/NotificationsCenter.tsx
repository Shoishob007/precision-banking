'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRealtime, type BalanceUpdatedPayload, type TransactionCreatedPayload, type TransactionFailedPayload } from '@/context/RealtimeContext';
import { apiRequest } from '@/lib/api';
import type { ActivityEvent } from '@/types';
import Notifications from '@/components/Notifications';

interface ActivityResponse {
    activity: ActivityEvent[];
}

export default function NotificationsCenter() {
    const { token } = useAuth();
    const { socket } = useRealtime();
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadInitialData = useCallback(async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const activityResponse = await apiRequest<ActivityResponse>('/api/dashboard/activity-feed?limit=60', {}, token);
            setActivity(activityResponse.activity);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to load notifications.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void loadInitialData();
    }, [loadInitialData]);

    const handleBalanceUpdated = useCallback((payload: BalanceUpdatedPayload) => {
        const event: ActivityEvent = {
            id: `bal-${payload.account.id}-${Date.now()}`,
            type: 'balance:updated',
            message: `Balance updated for ${payload.account.accountId}`,
            timestamp: new Date().toISOString(),
            status: 'info',
            metadata: `$${payload.account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        };

        setActivity((prev) => [event, ...prev].slice(0, 50));
    }, []);

    const handleTransactionCreated = useCallback((payload: TransactionCreatedPayload) => {
        const event: ActivityEvent = {
            id: `tx-ok-${payload.transaction.id}`,
            type: 'transaction:created',
            message: `${payload.transaction.type} completed`,
            timestamp: payload.transaction.createdAt,
            status: 'success',
            metadata: payload.transaction.transactionRef,
        };

        setActivity((prev) => [event, ...prev].slice(0, 50));
    }, []);

    const handleTransactionFailed = useCallback((payload: TransactionFailedPayload) => {
        const event: ActivityEvent = {
            id: `tx-fail-${payload.transaction.id}`,
            type: 'transaction:failed',
            message: payload.reason,
            timestamp: payload.transaction.createdAt,
            status: 'error',
            metadata: payload.transaction.transactionRef,
        };

        setActivity((prev) => [event, ...prev].slice(0, 50));
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('balance:updated', handleBalanceUpdated);
        socket.on('transaction:created', handleTransactionCreated);
        socket.on('transaction:failed', handleTransactionFailed);

        return () => {
            socket.off('balance:updated', handleBalanceUpdated);
            socket.off('transaction:created', handleTransactionCreated);
            socket.off('transaction:failed', handleTransactionFailed);
        };
    }, [socket, handleBalanceUpdated, handleTransactionCreated, handleTransactionFailed]);

    return (
        <div className="p-8 lg:p-12 w-full space-y-8">
            {error && (
                <div className="rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error">
                    {error}
                </div>
            )}

            <Notifications items={activity} isLoading={isLoading} maxHeightClass="max-h-[68vh]" className="mt-0" />
        </div>
    );
}
