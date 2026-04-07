'use client';

import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight,
  Bolt,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types';

import Link from 'next/link';

const allTransactions: Transaction[] = [
  { id: 'TX-88294-A', type: 'deposit', amount: 12450.00, status: 'success', timestamp: 'Oct 24, 2023 · 14:22:10', version: 'v1.2' },
  { id: 'TX-88295-B', type: 'withdraw', amount: -2000.00, status: 'failed', timestamp: 'Oct 24, 2023 · 15:45:02', version: 'v1.2', description: 'Insufficient balance' },
  { id: 'TX-88296-C', type: 'transfer', amount: -540.25, status: 'success', timestamp: 'Oct 25, 2023 · 09:12:33', version: 'v1.2' },
  { id: 'TX-88297-D', type: 'deposit', amount: 1200.00, status: 'success', timestamp: 'Oct 25, 2023 · 11:30:00', version: 'v1.2' },
  { id: 'TX-88298-E', type: 'deposit', amount: 4500.00, status: 'success', timestamp: 'Oct 26, 2023 · 10:00:00', version: 'v1.2' },
  { id: 'TX-88299-F', type: 'withdraw', amount: -150.00, status: 'success', timestamp: 'Oct 26, 2023 · 14:15:00', version: 'v1.2' },
  { id: 'TX-88300-G', type: 'transfer', amount: -1200.00, status: 'success', timestamp: 'Oct 27, 2023 · 08:45:00', version: 'v1.2' },
  { id: 'TX-88301-H', type: 'deposit', amount: 8900.00, status: 'success', timestamp: 'Oct 27, 2023 · 16:20:00', version: 'v1.2' },
  { id: 'TX-88302-I', type: 'withdraw', amount: -500.00, status: 'success', timestamp: 'Oct 28, 2023 · 09:10:00', version: 'v1.2' },
  { id: 'TX-88303-J', type: 'deposit', amount: 250.00, status: 'success', timestamp: 'Oct 28, 2023 · 11:55:00', version: 'v1.2' },
];

const feedEvents = [
  { id: 1, type: 'balance:updated', message: 'System ledger synchronized. New balance: ', highlight: '$142,504.22', time: 'Just now', color: 'secondary' },
  { id: 2, type: 'transaction:created', message: 'Deposit initiated via SWIFT-MT103. Awaiting node verification.', time: '4m ago', color: 'primary' },
  { id: 3, type: 'transaction:failed', message: 'Withdrawal ID: TX-88295-B failed due to liquidity mismatch in sub-ledger.', time: '15m ago', color: 'error' },
  { id: 4, type: 'security:login', message: 'New session established from IP: 192.168.1.1 (Stockholm, SE).', time: '1h ago', color: 'primary' },
  { id: 5, type: 'system:audit', message: 'Daily checksum verification completed. 1,422 entries verified.', time: '2h ago', color: 'tertiary' },
];

export default function Ledger() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('All Transactions');
  const itemsPerPage = 4;

  const filteredTransactions = useMemo(() => {
    if (filterType === 'All Transactions') return allTransactions;
    return allTransactions.filter(tx => tx.type.toLowerCase() === filterType.toLowerCase());
  }, [filterType]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  
  const currentTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Left Side: Table & Filters */}
      <section className="flex-1 p-8 overflow-y-auto custom-scrollbar">
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
            <div className="relative">
              <input 
                className="w-full bg-surface-container-lowest border-none rounded-lg text-sm text-on-surface px-4 py-2.5 focus:ring-1 focus:ring-primary/20" 
                placeholder="Jan 01, 2024 - Jan 31, 2024" 
                type="text"
              />
              <Calendar className="absolute right-3 top-2.5 text-slate-400" size={16} />
            </div>
          </div>
          <button className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-primary-dim transition-colors shadow-sm flex items-center gap-2">
            <Filter size={14} />
            Apply Filters
          </button>
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
              {currentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-surface-bright transition-colors group cursor-pointer">
                  <td className="px-6 py-5">
                    <Link href={`/transactions/${tx.id}`} className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-on-surface hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4">{tx.id}</span>
                      <span className="bg-surface-variant text-[9px] px-1.5 py-0.5 rounded text-on-surface-variant group-hover:bg-primary-container group-hover:text-primary transition-colors">
                        {tx.version}
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
                      tx.amount > 0 ? "text-secondary" : "text-on-surface"
                    )}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                      {tx.description && (
                        <span className="text-[10px] text-error font-medium italic">{tx.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs text-on-surface-variant">{tx.timestamp}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-8 flex justify-between items-center bg-surface-container-low px-6 py-4 rounded-xl">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Displaying {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} results
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
          {feedEvents.map((event) => (
            <div 
              key={event.id}
              className="bg-surface-container-lowest p-4 rounded-lg shadow-[0px_2px_10px_rgba(42,52,57,0.04)] relative overflow-hidden group"
            >
              <div className={cn(
                "absolute top-0 left-0 h-full w-1",
                event.color === 'secondary' ? "bg-secondary" : 
                event.color === 'primary' ? "bg-primary" : 
                event.color === 'error' ? "bg-error" : "bg-tertiary"
              )}></div>
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-tighter",
                  event.color === 'secondary' ? "text-secondary" : 
                  event.color === 'primary' ? "text-primary" : 
                  event.color === 'error' ? "text-error" : "text-tertiary"
                )}>{event.type}</span>
                <span className="text-[9px] text-on-surface-variant">{event.time}</span>
              </div>
              <p className="text-xs text-on-surface leading-relaxed">
                {event.message} {event.highlight && <span className={cn("font-bold", event.color === 'secondary' ? "text-secondary" : "text-on-surface")}>{event.highlight}</span>}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <button className="w-full py-2.5 bg-surface-container-high text-[10px] font-bold uppercase tracking-widest text-on-surface-variant rounded-lg hover:bg-surface-container-highest transition-colors">
            Clear Feed
          </button>
          
          <div className="p-6 bg-gradient-to-br from-primary to-primary-container rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Shield size={96} />
            </div>
            <h3 className="text-white font-bold text-lg mb-1 z-10 relative">Wealth Protection</h3>
            <p className="text-on-primary-container text-xs mb-4 z-10 relative">Your account is currently under 24/7 elite surveillance monitoring.</p>
            <button className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-md transition-colors z-10 relative">
              Security Audit
            </button>
          </div>
        </div>
      </aside>

      {/* Floating Technical Info */}
      <div className="fixed bottom-6 right-8 bg-on-surface text-surface text-[9px] px-3 py-1.5 rounded uppercase tracking-[0.2em] font-black z-50 hidden lg:block">
        System Instance: PR-ED-8849-V1.0.4
      </div>
    </div>
  );
}
