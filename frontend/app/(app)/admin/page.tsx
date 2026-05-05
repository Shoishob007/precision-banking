'use client';

import React, { useEffect, useState } from 'react';
import {
    ShieldUser,
    Users,
    Wallet,
    Lock,
    ReceiptText,
    Search,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    RefreshCcw,
    ScanSearch,
    X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import type { AdminManagedAccount, AdminMetrics, AuthUser, TransactionType, UserRole } from '@/types';

interface AdminSummaryResponse {
    metrics: AdminMetrics;
    recentUsers: AuthUser[];
    transactionMix: Array<{ type: TransactionType; total: number }>;
}

interface PaginatedAccountsResponse {
    page: number;
    limit: number;
    total: number;
    items: AdminManagedAccount[];
}

interface PaginatedUsersResponse {
    page: number;
    limit: number;
    total: number;
    items: AuthUser[];
}

const ACCOUNT_PAGE_SIZE = 12;
const USER_PAGE_SIZE = 8;

const ACCOUNT_QUICK_VIEWS = [
    { label: 'Locked Queue', description: 'Review accounts currently frozen.', filters: { status: 'locked', sharedOnly: false, owner: '', minBalance: '', type: '' } },
    { label: 'Shared Exposure', description: 'Inspect accounts with collaborators attached.', filters: { status: '', sharedOnly: true, owner: '', minBalance: '', type: '' } },
    { label: 'High Balance', description: 'Focus on large-value accounts.', filters: { status: '', sharedOnly: false, owner: '', minBalance: '100000', type: '' } },
    { label: 'Pending Review', description: 'Resolve accounts awaiting action.', filters: { status: 'pending', sharedOnly: false, owner: '', minBalance: '', type: '' } },
];

const USER_QUICK_VIEWS = [
    { label: 'Admins', query: 'role:admin', description: 'See elevated-access users.' },
    { label: 'Recent Signups', query: '', description: 'Review the latest user arrivals.' },
];

export default function AdminPage() {
    const { token, user } = useAuth();
    const [summary, setSummary] = useState<AdminSummaryResponse | null>(null);
    const [accounts, setAccounts] = useState<PaginatedAccountsResponse | null>(null);
    const [users, setUsers] = useState<PaginatedUsersResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [accountQueryDraft, setAccountQueryDraft] = useState('');
    const [accountQuery, setAccountQuery] = useState('');
    const [accountPage, setAccountPage] = useState(1);
    const [accountSortBy, setAccountSortBy] = useState<'updated' | 'balance' | 'owner' | 'account'>('updated');
    const [accountSortDirection, setAccountSortDirection] = useState<'asc' | 'desc'>('desc');
    const [accountStatusFilter, setAccountStatusFilter] = useState('');
    const [accountOwnerFilter, setAccountOwnerFilter] = useState('');
    const [accountTypeFilter, setAccountTypeFilter] = useState('');
    const [accountMinBalance, setAccountMinBalance] = useState('');
    const [accountSharedOnly, setAccountSharedOnly] = useState(false);
    const [showAdvancedAccountFilters, setShowAdvancedAccountFilters] = useState(false);

    const [userQueryDraft, setUserQueryDraft] = useState('');
    const [userQuery, setUserQuery] = useState('');
    const [userPage, setUserPage] = useState(1);

    useEffect(() => {
        if (!token || user?.role !== 'admin') {
            return;
        }

        apiRequest<AdminSummaryResponse>('/api/admin/summary', {}, token)
            .then(setSummary)
            .catch((requestError: Error) => setError(requestError.message));
    }, [token, user?.role]);

    useEffect(() => {
        if (!token || user?.role !== 'admin') {
            return;
        }

        const queryParts = [];
        const plainText = accountQuery.trim();

        if (plainText) {
            queryParts.push(plainText);
        }
        if (accountStatusFilter) {
            queryParts.push(`status:${accountStatusFilter}`);
        }
        if (accountOwnerFilter.trim()) {
            queryParts.push(`owner:${accountOwnerFilter.trim()}`);
        }
        if (accountTypeFilter.trim()) {
            queryParts.push(`type:${accountTypeFilter.trim()}`);
        }
        if (accountMinBalance.trim()) {
            queryParts.push(`balance>${accountMinBalance.trim()}`);
        }
        if (accountSharedOnly) {
            queryParts.push('shared:yes');
        }

        const searchParams = new URLSearchParams({
            page: String(accountPage),
            limit: String(ACCOUNT_PAGE_SIZE),
            sortBy: accountSortBy,
            sortDirection: accountSortDirection,
        });

        if (queryParts.length > 0) {
            searchParams.set('query', queryParts.join(' '));
        }

        apiRequest<PaginatedAccountsResponse>(`/api/admin/accounts?${searchParams.toString()}`, {}, token)
            .then(setAccounts)
            .catch((requestError: Error) => setError(requestError.message));
    }, [token, user?.role, accountPage, accountQuery, accountSortBy, accountSortDirection, accountStatusFilter, accountOwnerFilter, accountTypeFilter, accountMinBalance, accountSharedOnly]);

    useEffect(() => {
        if (!token || user?.role !== 'admin') {
            return;
        }

        const searchParams = new URLSearchParams({
            page: String(userPage),
            limit: String(USER_PAGE_SIZE),
        });

        if (userQuery.trim()) {
            searchParams.set('query', userQuery.trim());
        }

        apiRequest<PaginatedUsersResponse>(`/api/admin/users?${searchParams.toString()}`, {}, token)
            .then(setUsers)
            .catch((requestError: Error) => setError(requestError.message));
    }, [token, user?.role, userPage, userQuery]);

    if (user?.role !== 'admin') {
        return <div className="p-8 lg:p-12 text-sm text-on-surface-variant">Admin access is not available for this account.</div>;
    }

    async function handleAccountStatusChange(accountId: string, status: 'active' | 'standard' | 'pending' | 'locked') {
        if (!token || !accounts) return;

        setError(null);
        setMessage(null);

        try {
            const response = await apiRequest<{ account: AdminManagedAccount }>(`/api/admin/accounts/${accountId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            }, token);

            setAccounts((current) => current ? ({
                ...current,
                items: current.items.map((account) => account.accountId === accountId ? response.account : account),
            }) : current);
            setMessage(`Updated ${accountId} to ${status}.`);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to update status.');
        }
    }

    async function handleUserRoleChange(userId: string, role: UserRole) {
        if (!token || !users) return;

        setError(null);
        setMessage(null);

        try {
            const response = await apiRequest<{ user: AuthUser }>(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role }),
            }, token);

            setUsers((current) => current ? ({
                ...current,
                items: current.items.map((entry) => entry.id === userId ? response.user : entry),
            }) : current);
            setMessage(`Updated ${response.user.name} to ${role}.`);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to update role.');
        }
    }

    const accountTotalPages = accounts ? Math.max(1, Math.ceil(accounts.total / accounts.limit)) : 1;
    const userTotalPages = users ? Math.max(1, Math.ceil(users.total / users.limit)) : 1;
    const hasActiveAccountFilters =
        Boolean(accountQuery.trim()) ||
        Boolean(accountStatusFilter) ||
        Boolean(accountOwnerFilter.trim()) ||
        Boolean(accountTypeFilter.trim()) ||
        Boolean(accountMinBalance.trim()) ||
        accountSharedOnly;

    return (
        <div className="p-8 lg:p-12 space-y-8">
            {message && <div className="rounded-xl border border-secondary/20 bg-secondary-container/20 px-4 py-3 text-sm text-on-surface">{message}</div>}
            {error && <div className="rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error">{error}</div>}

            <div className="flex items-start gap-4 rounded-2xl bg-surface-container-low p-6">
                <ShieldUser className="mt-1 text-primary" size={24} />
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-on-surface">Admin Control Center</h2>
                    <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
                        Search accounts and users with a simpler, guided workflow. Start with normal text search, then refine only when needed.
                    </p>
                </div>
            </div>

            {summary && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                        <MetricCard icon={Users} label="Users" value={summary.metrics.totalUsers} />
                        <MetricCard icon={Wallet} label="Accounts" value={summary.metrics.totalAccounts} />
                        <MetricCard icon={ReceiptText} label="Transactions" value={summary.metrics.totalTransactions} />
                        <MetricCard icon={Lock} label="Locked" value={summary.metrics.lockedAccounts} />
                        <MetricCard icon={ShieldUser} label="Shared" value={summary.metrics.sharedAccounts} />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_420px] gap-6 items-start">
                        <section className="rounded-2xl bg-surface-container-low p-6 space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Account Search Workspace</h3>
                                    <p className="mt-1 text-sm text-on-surface-variant">
                                        {accounts ? `${accounts.total.toLocaleString('en-US')} accounts matched server-side` : 'Loading accounts...'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvancedAccountFilters((current) => !current)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-lowest"
                                    >
                                        <SlidersHorizontal size={14} />
                                        {showAdvancedAccountFilters ? 'Hide Filters' : 'More Filters'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAccountQueryDraft('');
                                            setAccountQuery('');
                                            setAccountStatusFilter('');
                                            setAccountOwnerFilter('');
                                            setAccountTypeFilter('');
                                            setAccountMinBalance('');
                                            setAccountSharedOnly(false);
                                            setAccountPage(1);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-lowest"
                                    >
                                        <RefreshCcw size={14} />
                                        Reset
                                    </button>
                                </div>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    setAccountPage(1);
                                    setAccountQuery(accountQueryDraft);
                                }}
                                className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_170px_170px_140px] gap-3"
                            >
                                <label className="relative block">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                                    <input
                                        value={accountQueryDraft}
                                        onChange={(e) => setAccountQueryDraft(e.target.value)}
                                        placeholder="Search by account name, owner, holder, or account ID"
                                        className="w-full rounded-lg bg-surface-container-lowest py-3 pl-10 pr-4 text-sm text-on-surface"
                                    />
                                </label>
                                <select
                                    value={accountSortBy}
                                    onChange={(e) => {
                                        setAccountSortBy(e.target.value as 'updated' | 'balance' | 'owner' | 'account');
                                        setAccountPage(1);
                                    }}
                                    className="rounded-lg bg-surface-container-lowest px-4 py-3 text-sm text-on-surface"
                                >
                                    <option value="updated">Sort: Updated</option>
                                    <option value="balance">Sort: Balance</option>
                                    <option value="owner">Sort: Owner</option>
                                    <option value="account">Sort: Account ID</option>
                                </select>
                                <select
                                    value={accountSortDirection}
                                    onChange={(e) => {
                                        setAccountSortDirection(e.target.value as 'asc' | 'desc');
                                        setAccountPage(1);
                                    }}
                                    className="rounded-lg bg-surface-container-lowest px-4 py-3 text-sm text-on-surface"
                                >
                                    <option value="desc">Direction: Desc</option>
                                    <option value="asc">Direction: Asc</option>
                                </select>
                                <button type="submit" className="rounded-lg bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-on-primary">
                                    Search
                                </button>
                            </form>

                            {showAdvancedAccountFilters && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 rounded-2xl bg-surface-container-lowest p-4">
                                    <select
                                        value={accountStatusFilter}
                                        onChange={(e) => {
                                            setAccountStatusFilter(e.target.value);
                                            setAccountPage(1);
                                        }}
                                        className="rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface"
                                    >
                                        <option value="">Any status</option>
                                        <option value="active">Active</option>
                                        <option value="standard">Standard</option>
                                        <option value="pending">Pending</option>
                                        <option value="locked">Locked</option>
                                    </select>
                                    <input
                                        value={accountOwnerFilter}
                                        onChange={(e) => {
                                            setAccountOwnerFilter(e.target.value);
                                            setAccountPage(1);
                                        }}
                                        placeholder="Owner name"
                                        className="rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface"
                                    />
                                    <input
                                        value={accountTypeFilter}
                                        onChange={(e) => {
                                            setAccountTypeFilter(e.target.value);
                                            setAccountPage(1);
                                        }}
                                        placeholder="Account type"
                                        className="rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface"
                                    />
                                    <input
                                        value={accountMinBalance}
                                        onChange={(e) => {
                                            setAccountMinBalance(e.target.value);
                                            setAccountPage(1);
                                        }}
                                        type="number"
                                        min="0"
                                        placeholder="Minimum balance"
                                        className="rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface"
                                    />
                                    <label className="flex items-center gap-3 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                                        <input
                                            type="checkbox"
                                            checked={accountSharedOnly}
                                            onChange={(e) => {
                                                setAccountSharedOnly(e.target.checked);
                                                setAccountPage(1);
                                            }}
                                        />
                                        Shared only
                                    </label>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                {ACCOUNT_QUICK_VIEWS.map((view) => (
                                    <button
                                        key={view.label}
                                        type="button"
                                        onClick={() => {
                                            setAccountQueryDraft('');
                                            setAccountQuery('');
                                            setAccountStatusFilter(view.filters.status);
                                            setAccountOwnerFilter(view.filters.owner);
                                            setAccountTypeFilter(view.filters.type);
                                            setAccountMinBalance(view.filters.minBalance);
                                            setAccountSharedOnly(view.filters.sharedOnly);
                                            setAccountPage(1);
                                            setShowAdvancedAccountFilters(true);
                                        }}
                                        className="rounded-xl bg-surface-container-lowest p-4 text-left hover:bg-surface-container-high"
                                    >
                                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface">{view.label}</p>
                                        <p className="mt-2 text-xs text-on-surface-variant">{view.description}</p>
                                    </button>
                                ))}
                            </div>

                            {hasActiveAccountFilters && (
                                <div className="flex flex-wrap gap-2 rounded-xl bg-surface-container-lowest px-4 py-3">
                                    {accountQuery && (
                                        <ActiveFilterChip label={`Search: ${accountQuery}`} onClear={() => {
                                            setAccountQuery('');
                                            setAccountQueryDraft('');
                                            setAccountPage(1);
                                        }} />
                                    )}
                                    {accountStatusFilter && (
                                        <ActiveFilterChip label={`Status: ${accountStatusFilter}`} onClear={() => {
                                            setAccountStatusFilter('');
                                            setAccountPage(1);
                                        }} />
                                    )}
                                    {accountOwnerFilter && (
                                        <ActiveFilterChip label={`Owner: ${accountOwnerFilter}`} onClear={() => {
                                            setAccountOwnerFilter('');
                                            setAccountPage(1);
                                        }} />
                                    )}
                                    {accountTypeFilter && (
                                        <ActiveFilterChip label={`Type: ${accountTypeFilter}`} onClear={() => {
                                            setAccountTypeFilter('');
                                            setAccountPage(1);
                                        }} />
                                    )}
                                    {accountMinBalance && (
                                        <ActiveFilterChip label={`Min balance: ${accountMinBalance}`} onClear={() => {
                                            setAccountMinBalance('');
                                            setAccountPage(1);
                                        }} />
                                    )}
                                    {accountSharedOnly && (
                                        <ActiveFilterChip label="Shared only" onClear={() => {
                                            setAccountSharedOnly(false);
                                            setAccountPage(1);
                                        }} />
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                {accounts?.items.map((account) => (
                                    <div key={account.id} className="rounded-xl bg-surface-container-lowest p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{account.name}</p>
                                                <p className="mt-1 text-[10px] uppercase tracking-widest text-on-surface-variant">
                                                    {account.accountId} | Owner {account.ownerName} | {account.type}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="rounded-full bg-primary-container/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">{account.status}</span>
                                                <span className="rounded-full bg-surface-container-low px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                                    {account.memberCount ?? 0} member{account.memberCount === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                            <InfoTile label="Balance" value={`$${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                                            <InfoTile label="Holder" value={account.holderName} />
                                            <InfoTile label="Updated" value={account.updatedAt ? new Date(account.updatedAt).toLocaleString() : 'Unknown'} />
                                        </div>
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-3">
                                            <div className="rounded-lg border border-outline-variant/10 px-3 py-3 text-xs text-on-surface-variant">
                                                Suggested refinements:
                                                <span className="ml-2 text-on-surface">owner "{account.ownerName}"</span>
                                                <span className="ml-2 text-on-surface">status "{account.status}"</span>
                                                <span className="ml-2 text-on-surface">type "{account.type}"</span>
                                            </div>
                                            <select
                                                value={account.status}
                                                onChange={(e) => void handleAccountStatusChange(account.accountId, e.target.value as 'active' | 'standard' | 'pending' | 'locked')}
                                                className="rounded-lg bg-surface-container-low px-3 py-3 text-xs font-bold uppercase tracking-widest text-on-surface"
                                            >
                                                <option value="active">Set Active</option>
                                                <option value="standard">Set Standard</option>
                                                <option value="pending">Set Pending</option>
                                                <option value="locked">Set Locked</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}

                                {accounts && accounts.items.length === 0 && (
                                    <div className="rounded-xl bg-surface-container-lowest px-4 py-8 text-center text-sm text-on-surface-variant">
                                        No accounts matched this command. Try broader text or tokens like <span className="font-mono">status:active</span>.
                                    </div>
                                )}
                            </div>

                            <PaginationBar
                                page={accounts?.page ?? 1}
                                totalPages={accountTotalPages}
                                onPrevious={() => setAccountPage((current) => Math.max(1, current - 1))}
                                onNext={() => setAccountPage((current) => Math.min(accountTotalPages, current + 1))}
                            />
                        </section>

                        <div className="space-y-6">
                            <section className="rounded-2xl bg-surface-container-low p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <ScanSearch className="text-primary" size={18} />
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Access Governance</h3>
                                        <p className="mt-1 text-sm text-on-surface-variant">Search users with role-aware commands and promote or demote access directly.</p>
                                    </div>
                                </div>

                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        setUserPage(1);
                                        setUserQuery(userQueryDraft);
                                    }}
                                    className="space-y-3"
                                >
                                    <label className="relative block">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                                        <input
                                            value={userQueryDraft}
                                            onChange={(e) => setUserQueryDraft(e.target.value)}
                                            placeholder="Search users or use role:admin"
                                            className="w-full rounded-lg bg-surface-container-lowest py-3 pl-10 pr-4 text-sm text-on-surface"
                                        />
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {USER_QUICK_VIEWS.map((view) => (
                                            <button
                                                key={view.label}
                                                type="button"
                                                onClick={() => {
                                                    setUserQueryDraft(view.query);
                                                    setUserQuery(view.query);
                                                    setUserPage(1);
                                                }}
                                                className="rounded-full bg-surface-container-lowest px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface"
                                            >
                                                {view.label}
                                            </button>
                                        ))}
                                        <button type="submit" className="rounded-full bg-primary px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-on-primary">
                                            Apply
                                        </button>
                                    </div>
                                </form>

                                <div className="space-y-3">
                                    {users?.items.map((entry) => (
                                        <div key={entry.id} className="rounded-xl bg-surface-container-lowest p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-on-surface">{entry.name}</p>
                                                    <p className="text-xs text-on-surface-variant">{entry.email}</p>
                                                </div>
                                                <span className="rounded-full bg-secondary-container/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary">
                                                    {entry.twoFactorEnabled ? '2FA On' : '2FA Off'}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
                                                <span>Last login</span>
                                                <span>{entry.lastLoginAt ? new Date(entry.lastLoginAt).toLocaleString() : 'No activity yet'}</span>
                                            </div>
                                            <select
                                                value={entry.role}
                                                onChange={(e) => void handleUserRoleChange(entry.id, e.target.value as UserRole)}
                                                className="mt-3 w-full rounded-lg bg-surface-container-low px-3 py-3 text-xs font-bold uppercase tracking-widest text-on-surface"
                                            >
                                                <option value="customer">Role: Customer</option>
                                                <option value="admin">Role: Admin</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <PaginationBar
                                    page={users?.page ?? 1}
                                    totalPages={userTotalPages}
                                    onPrevious={() => setUserPage((current) => Math.max(1, current - 1))}
                                    onNext={() => setUserPage((current) => Math.min(userTotalPages, current + 1))}
                                />
                            </section>

                            <section className="rounded-2xl bg-surface-container-low p-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Transaction Mix</h3>
                                <div className="space-y-3">
                                    {summary.transactionMix.map((entry) => (
                                        <div key={entry.type} className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-4 py-3">
                                            <span className="text-sm font-bold capitalize text-on-surface">{entry.type}</span>
                                            <span className="text-sm font-bold text-primary">{entry.total}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-2xl bg-surface-container-low p-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Recent Users</h3>
                                <div className="space-y-3">
                                    {summary.recentUsers.map((recentUser) => (
                                        <div key={recentUser.id} className="rounded-xl bg-surface-container-lowest px-4 py-3">
                                            <p className="text-sm font-bold text-on-surface">{recentUser.name}</p>
                                            <p className="text-xs text-on-surface-variant">{recentUser.email}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number; }) {
    return (
        <div className="rounded-2xl bg-surface-container-low p-5">
            <div className="flex items-center gap-3 mb-3">
                <Icon size={18} className="text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
            </div>
            <p className="text-3xl font-black tracking-tighter text-on-surface">{value.toLocaleString('en-US')}</p>
        </div>
    );
}

function InfoTile({ label, value }: { label: string; value: string; }) {
    return (
        <div className="rounded-lg bg-surface-container-low px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
            <p className="mt-1 text-sm font-bold text-on-surface">{value}</p>
        </div>
    );
}

function ActiveFilterChip({ label, onClear }: { label: string; onClear: () => void; }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-xs text-on-surface">
            <span>{label}</span>
            <button type="button" onClick={onClear} className="text-on-surface-variant hover:text-on-surface">
                <X size={14} />
            </button>
        </div>
    );
}

function PaginationBar({
    page,
    totalPages,
    onPrevious,
    onNext,
}: {
    page: number;
    totalPages: number;
    onPrevious: () => void;
    onNext: () => void;
}) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <SlidersHorizontal size={14} />
                <span>Page {page} of {totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={page <= 1}
                    className="rounded-lg border border-outline-variant/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-surface disabled:opacity-40"
                >
                    <span className="inline-flex items-center gap-2"><ChevronLeft size={14} /> Prev</span>
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-outline-variant/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-surface disabled:opacity-40"
                >
                    <span className="inline-flex items-center gap-2">Next <ChevronRight size={14} /></span>
                </button>
            </div>
        </div>
    );
}
