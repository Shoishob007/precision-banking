'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Trash2, Shield, Eye, Edit, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Account, AccountMember, AccountMemberRole } from '@/types';
import {
    listAccountMembers,
    addAccountMember,
    removeAccountMember,
    updateMemberRole,
} from '@/lib/account-member-api';
import { cn } from '@/lib/utils';

interface MembersPanelProps {
    account: Account;
    onClose: () => void;
}

const roleColors = {
    owner: { bg: 'bg-primary-container', text: 'text-on-primary-container', icon: '👑' },
    editor: { bg: 'bg-secondary-container', text: 'text-on-secondary-container', icon: '✏️' },
    viewer: { bg: 'bg-surface-container', text: 'text-on-surface-variant', icon: '👁️' },
};

export default function MembersPanel({ account, onClose }: MembersPanelProps) {
    const { token, user } = useAuth();
    const [members, setMembers] = useState<AccountMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<AccountMemberRole>('editor');
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [roleEditingId, setRoleEditingId] = useState<string | null>(null);

    const isOwner = members.some((m) => m.userId === user?.id && m.role === 'owner');

    useEffect(() => {
        if (!token) return;

        (async () => {
            try {
                setIsLoading(true);
                const data = await listAccountMembers(account.accountId, token);
                setMembers(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load members');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [account.accountId, token]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !newMemberEmail.trim()) return;

        setIsAddingMember(true);
        try {
            const member = await addAccountMember(
                account.accountId,
                newMemberEmail,
                newMemberRole,
                token,
            );
            setMembers([...members, member]);
            setNewMemberEmail('');
            setNewMemberRole('editor');
            setShowAddForm(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add member');
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!token || !isOwner) return;

        try {
            await removeAccountMember(account.accountId, memberId, token);
            setMembers(members.filter((m) => m.id !== memberId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove member');
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: AccountMemberRole) => {
        if (!token || !isOwner) return;

        const member = members.find((m) => m.id === memberId);
        if (!member) return;

        try {
            const updated = await updateMemberRole(
                account.accountId,
                member.userId,
                newRole,
                token,
            );
            setMembers(members.map((m) => (m.id === memberId ? updated : m)));
            setRoleEditingId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update role');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-outline-variant/20">
                    <div>
                        <h2 className="text-xl font-bold text-on-surface">Account Members</h2>
                        <p className="text-sm text-on-surface-variant mt-1">{account.accountId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {error && (
                        <div className="p-4 rounded-lg bg-error-container/20 text-error text-sm">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center py-8 text-on-surface-variant">
                            Loading members...
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence>
                                {members.map((member) => {
                                    const color = roleColors[member.role];
                                    return (
                                        <motion.div
                                            key={member.id}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-lg', color.bg)}>
                                                    {color.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-on-surface">{member.user.name}</p>
                                                    <p className="text-sm text-on-surface-variant">{member.user.email}</p>
                                                </div>
                                            </div>

                                            {roleEditingId === member.id && isOwner && member.role !== 'owner' ? (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) =>
                                                        handleUpdateRole(member.id, e.target.value as AccountMemberRole)
                                                    }
                                                    className={cn(
                                                        'px-2 py-1 rounded text-sm font-medium border border-outline-variant bg-surface-container-lowest',
                                                        color.text,
                                                    )}
                                                >
                                                    <option value="viewer">Viewer</option>
                                                    <option value="editor">Editor</option>
                                                </select>
                                            ) : (
                                                <div className={cn('px-2 py-1 rounded text-sm font-bold flex items-center gap-1', color.bg, color.text)}>
                                                    {member.role === 'owner' ? <Shield size={14} /> : member.role === 'editor' ? <Edit size={14} /> : <Eye size={14} />}
                                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                </div>
                                            )}

                                            {isOwner && member.role !== 'owner' && (
                                                <div className="flex gap-2 ml-3">
                                                    {roleEditingId !== member.id && (
                                                        <>
                                                            <button
                                                                onClick={() => setRoleEditingId(member.id)}
                                                                className="p-2 hover:bg-secondary-container/20 rounded transition-colors text-secondary"
                                                                title="Edit role"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveMember(member.userId)}
                                                                className="p-2 hover:bg-error-container/20 rounded transition-colors text-error"
                                                                title="Remove member"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {isOwner && !showAddForm && (
                    <div className="p-6 border-t border-outline-variant/20">
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-dim transition-colors"
                        >
                            <UserPlus size={18} />
                            Add Member
                        </button>
                    </div>
                )}

                {showAddForm && isOwner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-6 border-t border-outline-variant/20 bg-surface-container-high"
                    >
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-on-surface mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={newMemberEmail}
                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                    placeholder="alice@vance.corp"
                                    className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface mb-2">Role</label>
                                <select
                                    value={newMemberRole}
                                    onChange={(e) => setNewMemberRole(e.target.value as AccountMemberRole)}
                                    className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
                                >
                                    <option value="viewer">Viewer (read-only)</option>
                                    <option value="editor">Editor (can transact)</option>
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={isAddingMember}
                                    className="flex-1 px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-dim transition-colors disabled:opacity-50"
                                >
                                    {isAddingMember ? 'Adding...' : 'Add Member'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewMemberEmail('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
}
