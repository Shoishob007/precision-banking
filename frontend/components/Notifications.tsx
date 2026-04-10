'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityEvent } from '@/types';

interface NotificationsProps {
    items: ActivityEvent[];
    isLoading?: boolean;
    maxHeightClass?: string;
    className?: string;
}

function formatTimestamp(timestamp: string) {
    return new Date(timestamp).toLocaleString();
}

function activityColor(event: ActivityEvent) {
    if (event.status === 'error') {
        return 'error';
    }

    if (event.type === 'balance:updated') {
        return 'secondary';
    }

    return 'primary';
}

export default function Notifications({
    items,
    isLoading = false,
    maxHeightClass = 'max-h-80',
    className,
}: NotificationsProps) {
    return (
        <section className={cn('mt-8 rounded-xl bg-surface-container-low p-6', className)}>
            <div className="mb-5 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-on-surface uppercase tracking-widest">Notifications</h3>
                <div className="flex items-center gap-2 text-on-surface-variant">
                    <Bell size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Live Feed</span>
                </div>
            </div>

            <div className={cn(maxHeightClass, 'overflow-y-auto custom-scrollbar space-y-3 pr-1')}>
                {isLoading && items.length === 0 && (
                    <div className="rounded-lg bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
                        Loading notifications...
                    </div>
                )}

                {!isLoading && items.length === 0 && (
                    <div className="rounded-lg bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
                        No notifications yet.
                    </div>
                )}

                {items.map((event) => (
                    <article
                        key={event.id}
                        className="group relative overflow-hidden rounded-lg bg-surface-container-lowest p-4 shadow-[0px_2px_10px_rgba(42,52,57,0.04)]"
                    >
                        <div
                            className={cn(
                                'absolute left-0 top-0 h-full w-1',
                                activityColor(event) === 'secondary'
                                    ? 'bg-secondary'
                                    : activityColor(event) === 'primary'
                                        ? 'bg-primary'
                                        : 'bg-error',
                            )}
                        />

                        <div className="mb-2 flex items-start justify-between gap-3">
                            <span
                                className={cn(
                                    'text-[9px] font-bold uppercase tracking-tighter',
                                    activityColor(event) === 'secondary'
                                        ? 'text-secondary'
                                        : activityColor(event) === 'primary'
                                            ? 'text-primary'
                                            : 'text-error',
                                )}
                            >
                                {event.type}
                            </span>
                            <span className="text-[9px] text-on-surface-variant">{formatTimestamp(event.timestamp)}</span>
                        </div>

                        <p className="text-xs leading-relaxed text-on-surface">
                            {event.message}{' '}
                            {event.metadata && (
                                <span
                                    className={cn(
                                        'font-bold',
                                        activityColor(event) === 'secondary' ? 'text-secondary' : 'text-on-surface',
                                    )}
                                >
                                    {event.metadata}
                                </span>
                            )}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
}
