'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Lock, Wallet, Layers3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import type { Account } from '@/types';
import { cn } from '@/lib/utils';
import MembersPanel from '@/components/MembersPanel';

interface AccountsResponse {
    accounts: Account[];
}

export default function Accounts() {
    const { token } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterShared, setFilterShared] = useState(false);
    const [selectedAccountForMembers, setSelectedAccountForMembers] = useState<Account | null>(null);

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
    const sharedAccounts = accounts.filter((a) => a.isShared);
    const ownedAccounts = accounts.filter((a) => a.userRole === 'owner' && !a.isShared);
    const totalBalance = filteredAccounts.reduce((sum, account) => sum + account.balance, 0);

    return (
        <div className="p-8 lg:p-12 w-full space-y-10">
            <div className="flex flex-col items-start max-w-4xl">
                <span className="text-on-surface-variant font-sans text-[10px] uppercase tracking-[0.2em] mb-2">Portfolio Registry</span>
                <h3 className="text-3xl font-sans font-extrabold tracking-tighter text-on-surface leading-tight mb-4">Account Access Matrix</h3>
                <p className="text-on-surface-variant font-sans text-sm max-w-xl leading-relaxed">
                    Consolidated account inventory with ownership context, member topology, and version-state visibility.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error">
                    {error}
                </div>
            )}

            <div className="bg-surface-container-low rounded-xl p-2 inline-flex gap-2">
                <button
                    onClick={() => setFilterShared(false)}
                    className={cn(
                        'px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                        !filterShared
                            ? 'bg-surface-container-lowest text-primary'
                            : 'text-on-surface-variant hover:text-on-surface',
                    )}
                >
                    All Accounts ({accounts.length})
                </button>
                <button
                    onClick={() => setFilterShared(true)}
                    className={cn(
                        'px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2',
                        filterShared
                            ? 'bg-surface-container-lowest text-primary'
                            : 'text-on-surface-variant hover:text-on-surface',
                    )}
                >
                    <Users size={14} />
                    Shared Only ({sharedAccounts.length})
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-container-low rounded-xl p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Visible Accounts</p>
                    <p className="text-3xl font-black tracking-tighter text-on-surface">{filteredAccounts.length}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Personal Accounts</p>
                    <p className="text-3xl font-black tracking-tighter text-primary">{ownedAccounts.length}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Filtered Balance</p>
                    <p className="text-3xl font-black tracking-tighter text-on-surface">
                        ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="rounded-xl bg-surface-container-low px-6 py-5 text-sm text-on-surface-variant">
                    Loading accounts...
                </div>
            ) : filteredAccounts.length === 0 ? (
                <div className="rounded-xl bg-surface-container-low px-6 py-5 text-sm text-on-surface-variant">
                    {filterShared ? 'No shared accounts yet' : 'No accounts found'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredAccounts.map((account) => {
                        const canOpenMembersPanel = account.userRole === 'owner' || account.isShared;

                        return (
                            <motion.div
                                key={account.id}
                                whileHover={{ y: -3 }}
                                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                                className={cn(
                                    'group bg-surface-container-lowest p-7 rounded-lg shadow-[0px_20px_40px_rgba(42,52,57,0.04)] transition-all duration-300 hover:bg-surface-container-low h-full flex flex-col',
                                    account.status === 'locked' && 'border-l-4 border-tertiary',
                                )}
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <p className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest mb-1">Account ID</p>
                                        <p className="text-sm font-sans font-bold text-primary">{account.accountId}</p>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-sm bg-surface-variant">
                                        <span className="text-[9px] font-mono text-on-surface-variant">{account.versionLabel}</span>
                                    </div>
                                </div>

                                <div className="mb-7">
                                    <p className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest mb-1">Current Balance</p>
                                    <p className="text-3xl font-sans font-black tracking-tighter text-on-surface">
                                        ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between border-t border-surface-container-low pt-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Display Name</p>
                                        <p className="text-xs font-bold text-on-surface">{account.name}</p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                        <span
                                            className={cn(
                                                'px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1',
                                                account.userRole === 'owner'
                                                    ? 'bg-primary-container/40 text-primary'
                                                    : 'bg-surface-variant text-on-surface-variant',
                                            )}
                                        >
                                            <Wallet size={11} />
                                            {account.userRole ?? 'viewer'}
                                        </span>

                                        {canOpenMembersPanel && (
                                            <button
                                                onClick={() => setSelectedAccountForMembers(account)}
                                                className="cursor-pointer p-1.5 rounded-full bg-secondary-container/30 hover:bg-secondary-container/50 transition-colors text-secondary"
                                                title={account.userRole === 'owner' ? 'Manage members' : 'View members'}
                                            >
                                                <Users size={11} />
                                            </button>
                                        )}

                                        {account.status === 'locked' && (
                                            <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-tertiary-container text-on-tertiary-container flex items-center gap-1">
                                                <Lock size={11} />
                                                Locked
                                            </span>
                                        )}

                                        {!account.isShared && (
                                            <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-surface-variant text-on-surface-variant flex items-center gap-1">
                                                <Layers3 size={11} />
                                                Solo
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {selectedAccountForMembers && (
                <MembersPanel
                    account={selectedAccountForMembers}
                    onClose={() => setSelectedAccountForMembers(null)}
                />
            )}
        </div>
    );
}
