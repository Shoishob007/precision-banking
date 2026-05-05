export type TransactionType = "deposit" | "withdraw" | "transfer";
export type TransactionStatus = "success" | "failed" | "pending";
export type AccountMemberRole = "owner" | "editor" | "viewer";
export type UserRole = "customer" | "admin";
export type AccountStatus = "active" | "standard" | "pending" | "locked";

export interface Transaction {
  id: string;
  transactionRef: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
  processedAt?: string | null;
  accountId?: string | null;
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
}

export interface Account {
  id: string;
  accountId: string;
  name: string;
  type: string;
  balance: number;
  change?: number;
  changeType?: "up" | "down";
  status: AccountStatus;
  versionNumber: number;
  versionLabel: string;
  holderName: string;
  memberCount?: number;
  isShared?: boolean;
  userRole?: AccountMemberRole;
}

export interface AccountMember {
  id: string;
  userId: string;
  accountId: string;
  role: AccountMemberRole;
  user: {
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface ActivityEvent {
  id: string | number;
  type: string;
  message: string;
  timestamp: string;
  status: "success" | "error" | "info";
  metadata?: string | null;
  payload?: Record<string, unknown>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface DashboardMetrics {
  totalBalance: number;
  lockedAccounts: number;
  sharedAccounts: number;
  totalAccounts: number;
  successfulInflow: number;
  successfulOutflow: number;
  failedAmount: number;
}

export interface AdminMetrics {
  totalUsers: number;
  totalAccounts: number;
  totalTransactions: number;
  lockedAccounts: number;
  sharedAccounts: number;
  totalBalance: number;
}

export interface AdminManagedAccount {
  id: string;
  accountId: string;
  name: string;
  type: string;
  holderName: string;
  balance: number;
  status: AccountStatus;
  versionNumber: number;
  versionLabel: string;
  ownerName: string;
  updatedAt?: string | null;
  memberCount?: number;
}
