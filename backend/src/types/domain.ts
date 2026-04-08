export type TransactionType = "deposit" | "withdraw" | "transfer";
export type TransactionStatus = "success" | "failed" | "pending";
export type AccountStatus = "active" | "standard" | "pending" | "locked";

export interface AuthTokenPayload {
  userId: string;
  email: string;
}
