'use client';

import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Account, ActivityEvent } from '@/types';

const accounts: Account[] = [
  {
    id: 'ACC1001',
    name: 'Private Reserve',
    type: 'Wealth Management',
    balance: 1248092.45,
    change: 0.4,
    changeType: 'up',
    status: 'active',
    version: 'v1.4.2',
    holder: 'Julian Vance'
  },
  {
    id: 'ACC1002',
    name: 'Daily Operations',
    type: 'Personal Checking',
    balance: 452110.00,
    change: 2.1,
    changeType: 'down',
    status: 'standard',
    version: 'v1.1.0',
    holder: 'Vance Corp Operating'
  },
  {
    id: 'ACC1003',
    name: 'Escrow Reserve',
    type: 'Global Securities',
    balance: 0.00,
    status: 'locked',
    version: 'LOCKED',
    holder: 'Escrow Reserve'
  }
];

const recentEvents: ActivityEvent[] = [
  { id: 'TXN_99204_A', type: 'Inbound Wire', message: 'Central Bank', timestamp: 'Just now', status: 'success', metadata: '+$42,000.00' },
  { id: 'TXN_99203_B', type: 'Dividend Distribution', message: 'Vanguard Dividend', timestamp: '14m ago', status: 'success', metadata: '+$2,400.00' },
  { id: 'TXN_99202_C', type: 'Cloud Infrastructure', message: 'Compute Services', timestamp: '2h ago', status: 'error', metadata: '-$890.12' }
];

export default function Dashboard() {
  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto w-full space-y-12">
      {/* Header Section */}
      <div className="flex flex-col items-start max-w-4xl">
        <span className="text-on-surface-variant font-sans text-[10px] uppercase tracking-[0.2em] mb-2">Technical Overview</span>
        <h3 className="text-3xl font-sans font-extrabold tracking-tighter text-on-surface leading-tight mb-4">Operational Liquidity Dashboard</h3>
        <p className="text-on-surface-variant font-sans text-sm max-w-xl leading-relaxed">
          Real-time monitoring of multi-currency ledgers with version-locked state management. Technical precision prioritized for institutional reporting.
        </p>
      </div>

      {/* Account Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                <p className="text-sm font-sans font-bold text-primary">{account.id}</p>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-sm",
                account.status === 'locked' ? "bg-tertiary-container" : "bg-surface-variant"
              )}>
                <span className={cn(
                  "text-[9px] font-mono",
                  account.status === 'locked' ? "text-on-tertiary-container font-bold" : "text-on-surface-variant"
                )}>
                  {account.version}
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
              <span className="text-[11px] font-medium text-on-surface-variant">{account.holder}</span>
              <button className="text-primary hover:text-secondary-dim transition-colors">
                {account.status === 'locked' ? <Lock size={18} /> : <ArrowRight size={18} />}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Layer */}
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Recent Ledger Ingress</h4>
            <button className="text-[10px] font-bold text-secondary uppercase tracking-tighter hover:underline">Export XML</button>
          </div>
          <div className="bg-surface-container-low rounded-lg p-1">
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
                <span className="text-xs font-bold text-on-surface">{event.metadata}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-80 bg-surface-container-high rounded-xl p-8 relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-6">System Health</h4>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-medium text-primary">IOPS Load</span>
                  <span className="text-[10px] font-bold">14%</span>
                </div>
                <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '14%' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-secondary"
                  ></motion.div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-medium text-primary">Sync Latency</span>
                  <span className="text-[10px] font-bold">12ms</span>
                </div>
                <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '4%' }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-secondary"
                  ></motion.div>
                </div>
              </div>
            </div>
            <div className="mt-12 bg-white/50 backdrop-blur-md p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} className="text-on-surface" />
                <span className="text-[10px] font-bold text-on-surface">Precision Protocol v2.1</span>
              </div>
              <p className="text-[10px] font-sans text-on-surface-variant leading-relaxed">
                Connected via US-EAST-1 node. Optimistic locking active on all ledgers.
              </p>
            </div>
          </div>
          {/* Decorative architectural element */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 border border-white/20 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
