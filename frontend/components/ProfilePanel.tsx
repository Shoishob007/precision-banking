'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, UserRound, ShieldCheck, LogOut, ShieldUser, Smartphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
    const { user, logout } = useAuth();

    if (!isOpen) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                aria-label="Close profile panel"
                className="fixed inset-0 z-[70] bg-black/20"
                onClick={onClose}
            />
            <aside className="fixed right-4 top-20 z-[80] w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-[0px_30px_60px_rgba(0,0,0,0.16)]">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-primary">
                        <UserRound size={22} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-wide text-on-surface">Profile</h4>
                        <p className="text-[11px] text-on-surface-variant">Identity, access, and security controls</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Name</p>
                        <p className="text-sm font-semibold text-on-surface">{user?.name ?? 'Unknown user'}</p>
                        {user?.jobTitle && <p className="mt-1 text-xs text-on-surface-variant">{user.jobTitle}</p>}
                    </div>

                    <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Email</p>
                        <div className="flex items-center gap-2 text-sm text-on-surface">
                            <Mail size={14} className="text-on-surface-variant" />
                            <span>{user?.email ?? 'No email available'}</span>
                        </div>
                    </div>

                    <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Access</p>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                                <ShieldCheck size={14} />
                                <span>Authenticated Session</span>
                            </div>
                            <span className="rounded-full bg-primary-container/40 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                                {user?.role ?? 'customer'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-surface-container-low p-3">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">2FA</p>
                            <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                                <ShieldUser size={14} className={user?.twoFactorEnabled ? 'text-secondary' : 'text-on-surface-variant'} />
                                <span>{user?.twoFactorEnabled ? 'Enabled' : 'Recommended'}</span>
                            </div>
                        </div>

                        <div className="rounded-xl bg-surface-container-low p-3">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Phone</p>
                            <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                                <Smartphone size={14} className="text-on-surface-variant" />
                                <span>{user?.phoneNumber ?? 'Add one'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <Link
                        href="/profile"
                        onClick={onClose}
                        className="rounded-xl border border-outline-variant/20 px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-low"
                    >
                        Manage Profile
                    </Link>
                    {user?.role === 'admin' && (
                        <Link
                            href="/admin"
                            onClick={onClose}
                            className="rounded-xl border border-outline-variant/20 px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-low"
                        >
                            Admin Panel
                        </Link>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => logout()}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-error/90 py-3 text-xs font-bold uppercase tracking-widest text-white hover:brightness-110"
                >
                    <LogOut size={14} />
                    End Session
                </button>
            </aside>
        </>
    );
}
