'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, UserCog } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiRequest } from '@/lib/api';
import type { AuthUser } from '@/types';

interface UserResponse {
    user: AuthUser;
}

export default function ProfilePage() {
    const { token, user, updateUser } = useAuth();
    const [form, setForm] = useState({
        name: '',
        phoneNumber: '',
        jobTitle: '',
        twoFactorEnabled: false,
    });
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
    });
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        if (!token) {
            return;
        }

        apiRequest<UserResponse>('/api/users/me', {}, token)
            .then((data) => {
                updateUser(data.user);
                setForm({
                    name: data.user.name,
                    phoneNumber: data.user.phoneNumber ?? '',
                    jobTitle: data.user.jobTitle ?? '',
                    twoFactorEnabled: Boolean(data.user.twoFactorEnabled),
                });
            })
            .catch((requestError: Error) => setError(requestError.message));
    }, [token]);

    async function handleProfileSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!token) return;

        setIsSaving(true);
        setMessage(null);
        setError(null);

        try {
            const data = await apiRequest<UserResponse>('/api/users/me', {
                method: 'PATCH',
                body: JSON.stringify(form),
            }, token);
            updateUser(data.user);
            setMessage('Profile updated successfully.');
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to update profile.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handlePasswordSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!token) return;

        setIsChangingPassword(true);
        setMessage(null);
        setError(null);

        try {
            await apiRequest('/api/users/me/change-password', {
                method: 'POST',
                body: JSON.stringify(passwords),
            }, token);
            setPasswords({ currentPassword: '', newPassword: '' });
            setMessage('Password changed successfully.');
        } catch (requestError) {
            const nextError = requestError instanceof ApiError ? requestError.message : 'Unable to change password.';
            setError(nextError);
        } finally {
            setIsChangingPassword(false);
        }
    }

    return (
        <div className="p-8 lg:p-12 space-y-8">
            {(message || error) && (
                <div className={error ? 'rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error' : 'rounded-xl border border-secondary/20 bg-secondary-container/20 px-4 py-3 text-sm text-on-surface'}>
                    {error ?? message}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_420px] gap-6 items-start">
                <form onSubmit={handleProfileSubmit} className="rounded-2xl bg-surface-container-low p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <UserCog className="text-primary" size={20} />
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-on-surface">Profile Management</h3>
                            <p className="text-sm text-on-surface-variant">Keep identity, role context, and recovery details current.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Full Name</label>
                            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm text-on-surface" />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Phone Number</label>
                            <input value={form.phoneNumber} onChange={(e) => setForm((current) => ({ ...current, phoneNumber: e.target.value }))} className="w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm text-on-surface" placeholder="+1 202 555 0199" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Job Title</label>
                            <input value={form.jobTitle} onChange={(e) => setForm((current) => ({ ...current, jobTitle: e.target.value }))} className="w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm text-on-surface" placeholder="Treasury Analyst" />
                        </div>
                    </div>

                    <label className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-4 py-4">
                        <div>
                            <p className="text-sm font-bold text-on-surface">Two-factor protection</p>
                            <p className="text-xs text-on-surface-variant">Turn this on to make the demo feel closer to a real banking product.</p>
                        </div>
                        <input type="checkbox" checked={form.twoFactorEnabled} onChange={(e) => setForm((current) => ({ ...current, twoFactorEnabled: e.target.checked }))} className="h-5 w-5" />
                    </label>

                    <button type="submit" disabled={isSaving} className="rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-60">
                        {isSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>

                <div className="space-y-6">
                    <div className="rounded-2xl bg-surface-container-low p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck className="text-secondary" size={20} />
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-on-surface">Security Snapshot</h3>
                                <p className="text-sm text-on-surface-variant">Useful showcase details for your personal portfolio app.</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm text-on-surface">
                            <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest px-4 py-3">
                                <span>Role</span>
                                <span className="font-bold uppercase">{user?.role ?? 'customer'}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest px-4 py-3">
                                <span>2FA</span>
                                <span className="font-bold">{form.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest px-4 py-3">
                                <span>Last Login</span>
                                <span className="font-bold">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Not recorded'}</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="rounded-2xl bg-surface-container-low p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <KeyRound className="text-primary" size={20} />
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-on-surface">Password Rotation</h3>
                                <p className="text-sm text-on-surface-variant">A practical security workflow worth showcasing.</p>
                            </div>
                        </div>
                        <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((current) => ({ ...current, currentPassword: e.target.value }))} placeholder="Current password" className="w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm text-on-surface" />
                        <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords((current) => ({ ...current, newPassword: e.target.value }))} placeholder="New password (8+ chars)" className="w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm text-on-surface" />
                        <button type="submit" disabled={isChangingPassword} className="rounded-xl bg-on-surface px-5 py-3 text-xs font-bold uppercase tracking-widest text-surface disabled:opacity-60">
                            {isChangingPassword ? 'Updating...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
