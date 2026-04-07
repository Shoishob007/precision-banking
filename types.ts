export type TransactionType = 'deposit' | 'withdraw' | 'transfer';
export type TransactionStatus = 'success' | 'failed' | 'pending';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
  version: string;
  description?: string;
  reference?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  change?: number;
  changeType?: 'up' | 'down';
  status: 'active' | 'standard' | 'pending' | 'locked';
  version: string;
  holder: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  status: 'success' | 'error' | 'info';
  metadata?: string;
}
