'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import type { Account } from '@/types';
import { cn } from '@/lib/utils';

interface AccountsResponse {
    accounts: Account[];
}

export default function Accounts() {
    const { token } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterShared, setFilterShared] = useState(false);

    useEffect(() => {
        if (!token) return;

        (async () => {
            try {
                const data = await apiRequest<AccountsResponse>('/api/accounts', {}, token);
                setAccounts(data.accounts);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load accounts');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [token]);

    const filteredAccounts = filterShared ? accounts.filter((a) => a.isShared) : accounts;
    const ownedAccounts = accounts.filter((a) => !a.isShared);
    const sharedAccounts = accounts.filter((a) => a.isShared);

    return (
        <div className="p-8 lg:p-12 w-full space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-on-surface mb-2">All Accounts</h1>
                <p className="text-on-surface-variant">Manage your personal and shared accounts</p>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-error-container/20 text-error text-sm">
                    {error}
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-3">
                <button
                    onClick={() => setFilterShared(false)}
                    className={cn(
                        'px-4 py-2 rounded-lg font-medium transition-colors',
                        !filterShared
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                    )}
                >
                    All Accounts ({accounts.length})
                </button>
                <button
                    onClick={() => setFilterShared(true)}
                    className={cn(
                        'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                        filterShared
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                    )}
                >
                    <Users size={16} />
                    Shared ({sharedAccounts.length})
                </button>
            </div>

            {/* Accounts List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-12 text-on-surface-variant">Loading accounts...</div>
                ) : filteredAccounts.length === 0 ? (
                    <div className="text-center py-12 text-on-surface-variant">
                        {filterShared ? 'No shared accounts yet' : 'No accounts found'}
                    </div>
                ) : (
                    filteredAccounts.map((account) => (
                        <motion.div
                            key={account.id}
                            whileHover={{ x: 4 }}
                            className="p-6 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors border border-outline-variant/20"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-on-surface">{account.accountId}</h3>
                                        <div className="flex gap-2">
                                            {account.isShared && (
                                                <span className="px-2 py-1 rounded-full bg-secondary-container/30 text-secondary text-xs font-bold uppercase flex items-center gap-1">
                                                    <Users size={12} />
                                                    Shared
                                                </span>
                                            )}
                                            {account.status === 'locked' && (
                                                <span className="px-2 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-bold uppercase flex items-center gap-1">
                                                    <Lock size={12} />
                                                    Locked
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-on-surface-variant">{account.name}</p>
                                </div>

                                <div className="text-right">
                                    <p className="text-2xl font-black text-on-surface">
                                        ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-on-surface-variant">{account.versionLabel}</p>
                                    {account.isShared && (
                                        <p className="text-xs text-secondary-dim font-medium mt-1">
                                            {account.memberCount} {account.memberCount === 1 ? 'member' : 'members'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Stats */}
            {!isLoading && (
                <div className="grid grid-cols-2 gap-4 mt-12">
                    <div className="p-6 bg-primary-container/20 rounded-lg border border-primary/30">
                        <p className="text-on-surface-variant text-sm uppercase tracking-wider mb-2">Personal Accounts</p>
                        <p className="text-3xl font-bold text-primary">{ownedAccounts.length}</p>
                    </div>
                    <div className="p-6 bg-secondary-container/20 rounded-lg border border-secondary/30">
                        <p className="text-on-surface-variant text-sm uppercase tracking-wider mb-2">Shared Accounts</p>
                        <p className="text-3xl font-bold text-secondary">{sharedAccounts.length}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
