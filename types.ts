export type TransactionType = "deposit" | "withdraw" | "transfer";
export type TransactionStatus = "success" | "failed" | "pending";
export type AccountMemberRole = "owner" | "editor" | "viewer";

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
  status: "active" | "standard" | "pending" | "locked";
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
}
