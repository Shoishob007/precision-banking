'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Bolt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityEvent, Transaction } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

import Link from 'next/link';

interface TransactionsResponse {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
}

interface ActivityResponse {
  activity: ActivityEvent[];
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

export default function Ledger() {
  const { token } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('All Transactions');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feedEvents, setFeedEvents] = useState<ActivityEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 4;

  useEffect(() => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const typeQuery = filterType === 'All Transactions' ? '' : `&type=${filterType.toLowerCase()}`;
    const fromDateQuery = fromDate ? `&fromDate=${fromDate}` : '';
    const toDateQuery = toDate ? `&toDate=${toDate}` : '';

    Promise.all([
      apiRequest<TransactionsResponse>(`/api/transactions?page=${currentPage}&limit=${itemsPerPage}${typeQuery}${fromDateQuery}${toDateQuery}`, {}, token),
      apiRequest<ActivityResponse>('/api/dashboard/activity-feed?limit=10', {}, token)
    ])
      .then(([transactionData, activityData]) => {
        setTransactions(transactionData.items);
        setTotalCount(transactionData.total);
        setFeedEvents(activityData.activity);
      })
      .catch((requestError: Error) => {
        setError(requestError.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentPage, filterType, fromDate, toDate, itemsPerPage, token]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / itemsPerPage)), [totalCount, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full ">
      {/* Left Side: Table & Filters */}
      <section className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
        {error && (
          <div className="mb-6 rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-surface-container-low p-6 rounded-xl mb-8 flex flex-wrap gap-6 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Transaction Type</label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-surface-container-lowest border-none rounded-lg text-sm text-on-surface px-4 py-2.5 focus:ring-1 focus:ring-primary/20"
            >
              <option>All Transactions</option>
              <option>Deposit</option>
              <option>Withdraw</option>
              <option>Transfer</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Date Range</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFromDate(e.target.value);
                }}
                className="w-full bg-surface-container-lowest border-none rounded-lg text-sm text-on-surface px-4 py-2.5 focus:ring-1 focus:ring-primary/20"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setCurrentPage(1);
                  setToDate(e.target.value);
                }}
                className="w-full bg-surface-container-lowest border-none rounded-lg text-sm text-on-surface px-4 py-2.5 focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_2px_4px_rgba(0,0,0,0.02)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Reference ID</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Type</th>
                <th className="text-right px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Amount</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {isLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                    Loading transactions...
                  </td>
                </tr>
              )}
              {!isLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                    No transactions found for this user.
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-surface-bright transition-colors group cursor-pointer">
                  <td className="px-6 py-5">
                    <Link href={`/transactions/${tx.transactionRef}`} className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-on-surface hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4">{tx.transactionRef}</span>
                      <span className="bg-surface-variant text-[9px] px-1.5 py-0.5 rounded text-on-surface-variant group-hover:bg-primary-container group-hover:text-primary transition-colors">
                        {tx.metadata?.newVersion ? `v${String(tx.metadata.newVersion)}` : tx.status.toUpperCase()}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1 rounded",
                        tx.type === 'deposit' ? "bg-blue-50 text-blue-600" :
                          tx.type === 'withdraw' ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                      )}>
                        {tx.type === 'deposit' ? <ArrowDownLeft size={14} /> :
                          tx.type === 'withdraw' ? <ArrowUpRight size={14} /> : <ArrowLeftRight size={14} />}
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                        {tx.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className={cn(
                      "text-sm font-bold tracking-tight",
                      tx.type === 'deposit' ? "text-secondary" : "text-on-surface"
                    )}>
                      {tx.type === 'deposit' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full w-fit",
                        tx.status === 'success' ? "bg-secondary-container text-on-secondary-container" :
                          tx.status === 'failed' ? "bg-error-container text-on-error-container" : "bg-tertiary-container/20 text-on-tertiary-container"
                      )}>
                        {tx.status}
                      </span>
                      {tx.failureReason && (
                        <span className="text-[10px] text-error font-medium italic">{tx.failureReason}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs text-on-surface-variant">{formatTimestamp(tx.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-8 flex justify-between items-center bg-surface-container-low px-6 py-4 rounded-xl">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Displaying {transactions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 flex items-center justify-center rounded bg-surface-container-lowest text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded font-bold text-xs transition-all",
                  currentPage === page
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-lowest text-on-surface-variant hover:text-primary"
                )}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 flex items-center justify-center rounded bg-surface-container-lowest text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Right Sidebar: Real-time Notification Panel */}
      <aside className="hidden xl:flex flex-col w-80 bg-surface-container-low p-6 border-l border-transparent">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[10px] font-black text-on-surface uppercase tracking-widest">Activity Feed</h3>
          <Bolt className="text-on-surface-variant" size={18} />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {!isLoading && feedEvents.length === 0 && (
            <div className="bg-surface-container-lowest p-4 rounded-lg text-sm text-on-surface-variant">
              No activity yet for this user.
            </div>
          )}
          {feedEvents.map((event) => (
            <div
              key={event.id}
              className="bg-surface-container-lowest p-4 rounded-lg shadow-[0px_2px_10px_rgba(42,52,57,0.04)] relative overflow-hidden group"
            >
              <div className={cn(
                "absolute top-0 left-0 h-full w-1",
                activityColor(event) === 'secondary' ? "bg-secondary" :
                  activityColor(event) === 'primary' ? "bg-primary" : "bg-error"
              )}></div>
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-tighter",
                  activityColor(event) === 'secondary' ? "text-secondary" :
                    activityColor(event) === 'primary' ? "text-primary" : "text-error"
                )}>{event.type}</span>
                <span className="text-[9px] text-on-surface-variant">{formatTimestamp(event.timestamp)}</span>
              </div>
              <p className="text-xs text-on-surface leading-relaxed">
                {event.message} {event.metadata && <span className={cn("font-bold", activityColor(event) === 'secondary' ? "text-secondary" : "text-on-surface")}>{event.metadata}</span>}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6">
        </div>
      </aside>
    </div>
  );
}
