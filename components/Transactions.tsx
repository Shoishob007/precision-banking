'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowDownToLine, 
  AlertTriangle, 
  Loader2,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Transactions() {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('15000');
  const [transferAmount, setTransferAmount] = useState('25,000.00');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 2000);
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Deposit Section */}
        <section className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.02)]"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-sm font-bold tracking-tight text-on-surface uppercase">Deposit</h2>
              <span className="text-[10px] font-medium bg-surface-variant px-1.5 py-0.5 rounded-sm text-on-surface-variant">v1.2.0</span>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">Account Selector</label>
                <select className="w-full bg-surface-container-high border-none rounded-lg text-sm focus:ring-1 focus:ring-outline-variant focus:bg-surface-container-lowest precise-transition py-3">
                  <option>Primary Operations • 4492</option>
                  <option>Secondary Reserve • 8812</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">Amount Input</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input 
                    className="w-full bg-surface-container-high border-none rounded-lg text-sm pl-8 pr-4 py-3 focus:ring-1 focus:ring-outline-variant focus:bg-surface-container-lowest precise-transition" 
                    placeholder="0.00" 
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="bg-surface-container-low p-4 rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Real-time Balance Preview</p>
                <p className="text-xl font-bold tracking-tighter text-on-surface">
                  $12,450.00 <span className="text-secondary text-xs ml-1">+ ${depositAmount || '0.00'}</span>
                </p>
              </div>
              <button className="w-full bg-gradient-to-br from-primary to-primary-dim text-on-primary py-3 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/10 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                Execute Deposit
              </button>
            </form>
          </motion.div>
        </section>

        {/* Withdraw Section */}
        <section className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.02)]"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-sm font-bold tracking-tight text-on-surface uppercase">Withdraw</h2>
              <span className="text-[10px] font-medium bg-surface-variant px-1.5 py-0.5 rounded-sm text-on-surface-variant">v1.2.0</span>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">Source Account</label>
                <select className="w-full bg-surface-container-high border-none rounded-lg text-sm focus:ring-1 focus:ring-outline-variant focus:bg-surface-container-lowest precise-transition py-3">
                  <option>Primary Operations • 4492</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">Amount Input</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input 
                    className="w-full bg-surface-container-high border-none rounded-lg text-sm pl-8 pr-4 py-3 focus:ring-1 focus:ring-outline-variant focus:bg-surface-container-lowest precise-transition" 
                    type="number" 
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="bg-error-container/10 p-3 rounded-lg flex items-start gap-3 border border-error-container/20">
                <AlertTriangle className="text-error" size={18} />
                <div>
                  <p className="text-[10px] font-bold text-error uppercase tracking-tight">Balance Validation</p>
                  <p className="text-[11px] text-error">Requested amount exceeds current balance of $12,450.00</p>
                </div>
              </div>
              <div className="bg-surface-container-low p-4 rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Net Balance After</p>
                <p className="text-xl font-bold tracking-tighter text-error">-${(Number(withdrawAmount) - 12450).toFixed(2)}</p>
              </div>
              <button 
                className="w-full bg-surface-container-high text-on-surface-variant py-3 rounded-lg text-xs font-bold uppercase tracking-widest cursor-not-allowed opacity-50" 
                disabled
              >
                Insufficient Funds
              </button>
            </form>
          </motion.div>
        </section>

        {/* Transfer Section */}
        <section className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.02)] border border-transparent hover:border-outline-variant/10"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-sm font-bold tracking-tight text-on-surface uppercase">Transfer</h2>
              <span className="text-[10px] font-medium bg-surface-variant px-1.5 py-0.5 rounded-sm text-on-surface-variant">v1.2.1</span>
            </div>
            <form className="space-y-4" onSubmit={handleTransfer}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">From</label>
                  <select className="w-full bg-surface-container-high border-none rounded-lg text-sm py-3 px-4">
                    <option>Primary Operations</option>
                  </select>
                </div>
                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-surface-bright p-1 rounded-full shadow-sm">
                    <ArrowDownToLine className="text-primary" size={14} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">To</label>
                  <select className="w-full bg-surface-container-high border-none rounded-lg text-sm py-3 px-4">
                    <option>Secondary Reserve</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input 
                    className="w-full bg-surface-container-high border-none rounded-lg text-sm pl-8 pr-4 py-3" 
                    placeholder="0.00" 
                    type="text"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="bg-surface-container-low p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Fee</p>
                  <p className="text-xs font-bold text-on-surface">$0.00</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Processing</p>
                  <p className="text-xs font-bold text-secondary italic">Instant</p>
                </div>
              </div>
              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full bg-primary text-on-primary py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Processing...
                  </>
                ) : (
                  'Initiate Transfer'
                )}
              </button>
            </form>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-surface-container-low rounded-xl p-6"
          >
            <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Security Protocol</h3>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                <img 
                  className="w-8 h-8 rounded-full border-2 border-surface shadow-sm" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnDUCbRlhsiwtceV1VttSxw-PZr4NFpV6nQ7du8PPUIGOZIcsbxOD6Jdyyjb7neNE_8yTDY1EvJgkkC5THpnr5EYq5P8_c_h-1ClwdugbpzcKDRaOcVcPb36aNCm8rqUxQl5qP7WCrpk00uP0N102BKV3bZKLEBf1pbzPNIqAlFBS95qKWCr4Jlb-k9gMlGtKpAm3Fdl9qJEtDGpxeGMQZ8ypSGF4HVXWSmC_xzVhFqyI8YC17QaFnRL6W0hhXeSjM2_gDS8bcYKg" 
                  alt="Analyst"
                  referrerPolicy="no-referrer"
                />
                <img 
                  className="w-8 h-8 rounded-full border-2 border-surface shadow-sm" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDt-Tk7nJ__BuKEkCMnqJkcclYftXTmfIL5wWkHVbGytv71b2WMbIc2rMtQ1P1zMY-nrW4J1kWGXbeXn9bxht_33v1t3SoA4tuwteL845rNoqx9upwKjfsLHd_Sp3npyJngAV51DxL6o9-OlH5GPFSQf1tgm_Vj5LljWodGN0Jn7r6INSFQP9wFOW5as_TFg7-ksd2wQuoB57bcLboj1QBrkcOD-70k-rG9CH8MieBCSn6MvcIxXj0_M8EKwMHZKTBYOd_aSFgBsbg" 
                  alt="Manager"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant leading-tight">Requires dual-signature for transfers exceeding $50,000.00</p>
            </div>
          </motion.div>
        </section>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-surface-container-low rounded-xl p-8 flex flex-col justify-between min-h-[200px] relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2">Technical Status</p>
            <h4 className="text-2xl font-black text-on-surface tracking-tighter">System Health: Optimal</h4>
            <p className="text-sm text-on-surface-variant mt-2 max-w-xs">All architectural nodes are performing at 14ms latency. Ledger synchronization 100% complete.</p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <ShieldCheck size={120} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-surface-container-high rounded-xl p-8 relative overflow-hidden group"
        >
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2">Real-time Feed</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <p className="text-xs font-medium text-on-surface">Incoming Deposit $4,200.00 Confirmed</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-outline"></div>
                  <p className="text-xs font-medium text-on-surface-variant">Withdrawal Request ID: 8849-B Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm group-hover:bg-surface-bright transition-all">
              <BarChart3 className="text-primary" size={24} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
