'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    Shield,
    Clock,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import type { Transaction } from '@/types';

interface TransactionDetailResponse {
    transaction: Transaction;
}

function formatTimestamp(timestamp: string) {
    return new Date(timestamp).toLocaleString();
}

export default function TransactionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const id = params.id as string;
    const [tx, setTx] = useState<Transaction | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token || !id) {
            return;
        }

        apiRequest<TransactionDetailResponse>(`/api/transactions/${id}`, {}, token)
            .then((data) => {
                setTx(data.transaction);
            })
            .catch((requestError: Error) => {
                setError(requestError.message);
            });
    }, [id, token]);

    return (
        <div className="p-8 lg:p-12 w-full max-w-4xl">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors mb-8 group"
            >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Back to Ledger</span>
            </button>

            {error && (
                <div className="mb-6 rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error">
                    {error}
                </div>
            )}

            {!tx && !error && (
                <div className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    Loading transaction...
                </div>
            )}

            {tx && (

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container-lowest rounded-2xl p-10 shadow-[0px_40px_80px_rgba(0,0,0,0.05)] border border-outline-variant/10"
                >
                    <div className="flex justify-between items-start mb-12 gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Transaction Detail</span>
                                <span className="bg-surface-variant text-[9px] px-2 py-0.5 rounded text-on-surface-variant font-mono">
                                    {tx.metadata?.newVersion ? `v${String(tx.metadata.newVersion)}` : tx.status.toUpperCase()}
                                </span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter text-on-surface">{tx.transactionRef}</h1>
                            <p className="text-sm text-on-surface-variant mt-2">{tx.failureReason ?? `${tx.type} processed successfully.`}</p>
                        </div>
                        <div
                            className={cn(
                                'px-4 py-2 rounded-full flex items-center gap-2',
                                tx.status === 'success'
                                    ? 'bg-secondary-container text-on-secondary-container'
                                    : 'bg-error-container text-on-error-container'
                            )}
                        >
                            {tx.status === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span className="text-xs font-bold uppercase tracking-widest">{tx.status}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Amount</label>
                                <p className="text-4xl font-black tracking-tighter text-on-surface">
                                    ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Type</label>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-surface-container-low rounded-lg text-primary">
                                        {tx.type === 'deposit' ? (
                                            <ArrowDownLeft size={20} />
                                        ) : tx.type === 'withdraw' ? (
                                            <ArrowUpRight size={20} />
                                        ) : (
                                            <ArrowLeftRight size={20} />
                                        )}
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-widest text-on-surface">{tx.type}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Sender</label>
                                <p className="text-sm font-medium text-on-surface">{tx.sourceAccountId ?? tx.accountId ?? 'External source'}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Receiver</label>
                                <p className="text-sm font-medium text-on-surface">{tx.destinationAccountId ?? tx.accountId ?? 'Primary account'}</p>
                            </div>
                            <div className="pt-4 border-t border-outline-variant/10">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-on-surface-variant">Network Fee</span>
                                    <span className="text-secondary">$0.00</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-outline-variant/10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Timestamp</label>
                                <div className="flex items-center gap-2 text-xs text-on-surface">
                                    <Clock size={14} className="text-on-surface-variant" />
                                    {formatTimestamp(tx.createdAt)}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Node Instance</label>
                                <div className="flex items-center gap-2 text-xs text-on-surface">
                                    <Shield size={14} className="text-on-surface-variant" />
                                    AP-SOUTHEAST-1
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Cryptographic Hash</label>
                                <p className="text-[10px] font-mono text-on-surface-variant truncate">{tx.id}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
