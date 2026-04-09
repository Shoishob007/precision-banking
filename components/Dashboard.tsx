'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, ArrowRight, Lock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Account, ActivityEvent } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useRealtime, type BalanceUpdatedPayload, type TransactionCreatedPayload, type TransactionFailedPayload } from '@/context/RealtimeContext';
import MembersPanel from '@/components/MembersPanel';

interface DashboardSummaryResponse {
  accounts: Account[];
  activity: ActivityEvent[];
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

export default function Dashboard() {
  const { token } = useAuth();
  const { socket } = useRealtime();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountForMembers, setSelectedAccountForMembers] = useState<Account | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    apiRequest<DashboardSummaryResponse>('/api/dashboard/summary', {}, token)
      .then((data) => {
        setAccounts(data.accounts);
        setRecentEvents(data.activity);
      })
      .catch((requestError: Error) => {
        setError(requestError.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleBalanceUpdated = useCallback((payload: BalanceUpdatedPayload) => {
    setAccounts((prev) =>
      prev.map((account) =>
        account.accountId === payload.account.accountId ? { ...account, ...payload.account } : account,
      ),
    );
  }, []);

  const handleTransactionCreated = useCallback((payload: TransactionCreatedPayload) => {
    const event: ActivityEvent = {
      id: payload.transaction.id,
      type: payload.transaction.type,
      message: `${payload.transaction.type} of $${payload.transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} completed`,
      timestamp: payload.transaction.createdAt,
      status: 'success',
      metadata: payload.transaction.transactionRef,
    };
    setRecentEvents((prev) => [event, ...prev.slice(0, 19)]);
  }, []);

  const handleTransactionFailed = useCallback((payload: TransactionFailedPayload) => {
    const event: ActivityEvent = {
      id: payload.transaction.id,
      type: payload.transaction.type,
      message: `${payload.transaction.type} failed: ${payload.reason}`,
      timestamp: payload.transaction.createdAt,
      status: 'error',
      metadata: payload.transaction.transactionRef,
    };
    setRecentEvents((prev) => [event, ...prev.slice(0, 19)]);
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
    <div className="p-8 lg:p-12 w-full space-y-12">
      {/* Header Section */}
      <div className="flex flex-col items-start max-w-4xl">
        <span className="text-on-surface-variant font-sans text-[10px] uppercase tracking-[0.2em] mb-2">Technical Overview</span>
        <h3 className="text-3xl font-sans font-extrabold tracking-tighter text-on-surface leading-tight mb-4">Operational Liquidity Dashboard</h3>
        <p className="text-on-surface-variant font-sans text-sm max-w-xl leading-relaxed">
          Real-time monitoring of multi-currency ledgers with version-locked state management. Technical precision prioritized for institutional reporting.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Account Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading && accounts.length === 0 && (
          <div className="col-span-full rounded-xl bg-surface-container-low px-6 py-5 text-sm text-on-surface-variant">
            Loading accounts...
          </div>
        )}
        {accounts.map((account) => (
          <motion.div
            key={account.id}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className={cn(
              "group bg-surface-container-lowest p-8 rounded-lg shadow-[0px_20px_40px_rgba(42,52,57,0.04)] transition-all duration-300 relative cursor-pointer hover:bg-surface-container-low",
              account.status === 'locked' && "border-l-4 border-tertiary"
            )}
          >
            <div className="flex justify-between items-start mb-10">
              <div>
                <p className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest mb-1">Account ID</p>
                <p className="text-sm font-sans font-bold text-primary">{account.accountId}</p>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-sm",
                account.status === 'locked' ? "bg-tertiary-container" : "bg-surface-variant"
              )}>
                <span className={cn(
                  "text-[9px] font-mono",
                  account.status === 'locked' ? "text-on-tertiary-container font-bold" : "text-on-surface-variant"
                )}>
                  {account.versionLabel}
                </span>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest mb-1">Current Balance</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-sans font-black tracking-tighter text-on-surface">
                  ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                {account.change && (
                  <div className={cn(
                    "flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                    account.changeType === 'up' ? "bg-secondary-container text-on-secondary-container" : "bg-error-container/20 text-error"
                  )}>
                    {account.changeType === 'up' ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
                    {account.changeType === 'up' ? '+' : '-'}{account.change}%
                  </div>
                )}
                {account.status === 'locked' && (
                  <div className="flex items-center bg-surface-container-high px-1.5 py-0.5 rounded-full text-[9px] font-bold text-on-surface-variant">
                    STABLE
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-surface-container-low pt-4 mt-auto">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-on-surface-variant">{account.holderName}</span>
                {account.isShared && (
                  <button
                    onClick={() => setSelectedAccountForMembers(account)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container/30 hover:bg-secondary-container/50 transition-colors text-secondary text-[9px] font-bold uppercase"
                    title="View members"
                  >
                    <Users size={12} />
                    {account.memberCount ?? 0}
                  </button>
                )}
              </div>
              <button
                className="text-primary hover:text-secondary-dim transition-colors"
                onClick={() => account.isShared && setSelectedAccountForMembers(account)}
              >
                {account.status === 'locked' ? <Lock size={18} /> : account.isShared ? <Users size={18} /> : <ArrowRight size={18} />}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Layer */}
      <div>
        <div>
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Recent Ledger Ingress</h4>
          </div>
          <div className="bg-surface-container-low rounded-lg p-1">
            {!isLoading && recentEvents.length === 0 && (
              <div className="bg-surface-container-lowest p-4 rounded text-sm text-on-surface-variant">
                No activity yet for this user.
              </div>
            )}
            {recentEvents.map((event) => (
              <motion.div
                key={event.id}
                whileHover={{ x: 4 }}
                className="bg-surface-container-lowest p-4 rounded mb-1 flex items-center justify-between transition-colors last:mb-0 cursor-pointer hover:bg-surface-container-low"
              >
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    event.status === 'success' ? "bg-secondary" : "bg-error"
                  )}></div>
                  <span className="font-mono text-[11px] text-primary">{event.id}</span>
                  <span className="text-xs font-medium">{event.type} - {event.message}</span>
                </div>
                <span className="text-xs font-bold text-on-surface">{event.metadata ?? formatTimestamp(event.timestamp)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {selectedAccountForMembers && (
        <MembersPanel
          account={selectedAccountForMembers}
          onClose={() => setSelectedAccountForMembers(null)}
        />
      )}
    </div>
  );
}
