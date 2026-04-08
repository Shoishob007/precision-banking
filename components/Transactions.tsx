'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownToLine,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiRequest } from '@/lib/api';
import type { Account } from '@/types';

interface AccountsResponse {
  accounts: Account[];
}

interface TransactionCreateResponse {
  transaction: {
    transactionRef: string;
    status: string;
  };
  updatedAccounts: Account[];
}

function parseAmount(value: string) {
  const normalized = value.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function Transactions() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedDepositAccount, setSelectedDepositAccount] = useState('');
  const [selectedWithdrawAccount, setSelectedWithdrawAccount] = useState('');
  const [selectedTransferFromAccount, setSelectedTransferFromAccount] = useState('');
  const [selectedTransferToAccount, setSelectedTransferToAccount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isDepositProcessing, setIsDepositProcessing] = useState(false);
  const [isWithdrawProcessing, setIsWithdrawProcessing] = useState(false);
  const [isTransferProcessing, setIsTransferProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    apiRequest<AccountsResponse>('/api/accounts', {}, token)
      .then((data) => {
        setAccounts(data.accounts);

        if (data.accounts.length > 0) {
          setSelectedDepositAccount((current) => current || data.accounts[0].accountId);
          setSelectedWithdrawAccount((current) => current || data.accounts[0].accountId);
          setSelectedTransferFromAccount((current) => current || data.accounts[0].accountId);
          setSelectedTransferToAccount((current) => {
            if (current) {
              return current;
            }

            return data.accounts[1]?.accountId ?? data.accounts[0].accountId;
          });
        }
      })
      .catch((requestError: Error) => {
        setError(requestError.message);
      });
  }, [token]);

  const depositAccount = useMemo(
    () => accounts.find((account) => account.accountId === selectedDepositAccount) ?? null,
    [accounts, selectedDepositAccount]
  );

  const withdrawAccount = useMemo(
    () => accounts.find((account) => account.accountId === selectedWithdrawAccount) ?? null,
    [accounts, selectedWithdrawAccount]
  );

  const transferSourceAccount = useMemo(
    () => accounts.find((account) => account.accountId === selectedTransferFromAccount) ?? null,
    [accounts, selectedTransferFromAccount]
  );

  async function refreshAccounts() {
    if (!token) {
      return;
    }

    const data = await apiRequest<AccountsResponse>('/api/accounts', {}, token);
    setAccounts(data.accounts);
  }

  async function handleDepositSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsDepositProcessing(true);

    try {
      const result = await apiRequest<TransactionCreateResponse>('/api/transactions/deposit', {
        method: 'POST',
        body: JSON.stringify({
          accountId: selectedDepositAccount,
          amount: parseAmount(depositAmount),
          metadata: { source: 'frontend-deposit-form' }
        })
      }, token);

      await refreshAccounts();
      setDepositAmount('');
      setFeedback(`Deposit completed: ${result.transaction.transactionRef}`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Deposit failed.');
    } finally {
      setIsDepositProcessing(false);
    }
  }

  async function handleWithdrawSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsWithdrawProcessing(true);

    try {
      const result = await apiRequest<TransactionCreateResponse>('/api/transactions/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          accountId: selectedWithdrawAccount,
          amount: parseAmount(withdrawAmount),
          metadata: { source: 'frontend-withdraw-form' }
        })
      }, token);

      await refreshAccounts();
      setWithdrawAmount('');
      setFeedback(`Withdrawal completed: ${result.transaction.transactionRef}`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Withdrawal failed.');
    } finally {
      setIsWithdrawProcessing(false);
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsTransferProcessing(true);

    try {
      const result = await apiRequest<TransactionCreateResponse>('/api/transactions/transfer', {
        method: 'POST',
        body: JSON.stringify({
          sourceAccountId: selectedTransferFromAccount,
          destinationAccountId: selectedTransferToAccount,
          amount: parseAmount(transferAmount),
          metadata: { source: 'frontend-transfer-form' }
        })
      }, token);

      await refreshAccounts();
      setTransferAmount('');
      setFeedback(`Transfer completed: ${result.transaction.transactionRef}`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Transfer failed.');
    } finally {
      setIsTransferProcessing(false);
    }
  };

  const withdrawPreview = Math.max((withdrawAccount?.balance ?? 0) - parseAmount(withdrawAmount), 0);
  const withdrawWouldFail = parseAmount(withdrawAmount) > (withdrawAccount?.balance ?? 0);

  return (
    <div className="p-8 lg:p-12 w-full">
      {(error || feedback) && (
        <div className={error ? 'mb-6 rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error' : 'mb-6 rounded-xl border border-secondary/20 bg-secondary-container/20 px-4 py-3 text-sm text-on-surface'}>
          {error ?? feedback}
        </div>
      )}

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
              <span className="text-[10px] font-medium bg-surface-variant px-1.5 py-0.5 rounded-sm text-on-surface-variant">live</span>
            </div>
            <form className="space-y-4" onSubmit={handleDepositSubmit}>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">Account Selector</label>
                <select value={selectedDepositAccount} onChange={(e) => setSelectedDepositAccount(e.target.value)} className="w-full bg-surface-container-high border-none rounded-lg text-sm focus:ring-1 focus:ring-outline-variant focus:bg-surface-container-lowest precise-transition py-3">
                  {accounts.map((account) => (
                    <option key={account.id} value={account.accountId}>{account.name} • {account.accountId}</option>
                  ))}
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
                  ${(depositAccount?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-secondary text-xs ml-1">+ ${parseAmount(depositAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </p>
              </div>
              <button type="submit" disabled={isDepositProcessing || !selectedDepositAccount} className="w-full bg-gradient-to-br from-primary to-primary-dim text-on-primary py-3 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/10 hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {isDepositProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Execute Deposit'}
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
              <span className="text-[10px] font-medium bg-surface-variant px-1.5 py-0.5 rounded-sm text-on-surface-variant">live</span>
            </div>
            <form className="space-y-4" onSubmit={handleWithdrawSubmit}>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">Source Account</label>
                <select value={selectedWithdrawAccount} onChange={(e) => setSelectedWithdrawAccount(e.target.value)} className="w-full bg-surface-container-high border-none rounded-lg text-sm focus:ring-1 focus:ring-outline-variant focus:bg-surface-container-lowest precise-transition py-3">
                  {accounts.map((account) => (
                    <option key={account.id} value={account.accountId}>{account.name} • {account.accountId}</option>
                  ))}
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
              <div className={withdrawWouldFail ? 'bg-error-container/10 p-3 rounded-lg flex items-start gap-3 border border-error-container/20' : 'bg-surface-container-low p-3 rounded-lg flex items-start gap-3 border border-transparent'}>
                <AlertTriangle className={withdrawWouldFail ? 'text-error' : 'text-on-surface-variant'} size={18} />
                <div>
                  <p className={withdrawWouldFail ? 'text-[10px] font-bold text-error uppercase tracking-tight' : 'text-[10px] font-bold text-on-surface-variant uppercase tracking-tight'}>Balance Validation</p>
                  <p className={withdrawWouldFail ? 'text-[11px] text-error' : 'text-[11px] text-on-surface-variant'}>
                    {withdrawWouldFail
                      ? `Requested amount exceeds current balance of $${(withdrawAccount?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : `Available balance: $${(withdrawAccount?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-low p-4 rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Net Balance After</p>
                <p className={withdrawWouldFail ? 'text-xl font-bold tracking-tighter text-error' : 'text-xl font-bold tracking-tighter text-on-surface'}>${withdrawPreview.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-on-primary py-3 rounded-lg text-xs font-bold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isWithdrawProcessing || !selectedWithdrawAccount || withdrawWouldFail}
              >
                {isWithdrawProcessing ? <Loader2 className="animate-spin mx-auto" size={16} /> : withdrawWouldFail ? 'Insufficient Funds' : 'Execute Withdrawal'}
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
              <span className="text-[10px] font-medium bg-surface-variant px-1.5 py-0.5 rounded-sm text-on-surface-variant">live</span>
            </div>
            <form className="space-y-4" onSubmit={handleTransfer}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">From</label>
                  <select value={selectedTransferFromAccount} onChange={(e) => setSelectedTransferFromAccount(e.target.value)} className="w-full bg-surface-container-high border-none rounded-lg text-sm py-3 px-4">
                    {accounts.map((account) => (
                      <option key={account.id} value={account.accountId}>{account.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-surface-bright p-1 rounded-full shadow-sm">
                    <ArrowDownToLine className="text-primary" size={14} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant mb-1">To</label>
                  <select value={selectedTransferToAccount} onChange={(e) => setSelectedTransferToAccount(e.target.value)} className="w-full bg-surface-container-high border-none rounded-lg text-sm py-3 px-4">
                    {accounts.filter((account) => account.accountId !== selectedTransferFromAccount).map((account) => (
                      <option key={account.id} value={account.accountId}>{account.name}</option>
                    ))}
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
                disabled={isTransferProcessing || !selectedTransferFromAccount || !selectedTransferToAccount || selectedTransferFromAccount === selectedTransferToAccount}
                className="w-full bg-primary text-on-primary py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {isTransferProcessing ? (
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
        </section>
      </div>
    </div>
  );
}
