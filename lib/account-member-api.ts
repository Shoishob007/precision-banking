import { apiRequest, ApiError } from "@/lib/api";
import type { AccountMember, AccountMemberRole } from "@/types";

export interface ListMembersResponse {
  members: AccountMember[];
}

export interface AddMemberRequest {
  email: string;
  role: AccountMemberRole;
}

export interface AddMemberResponse {
  member: AccountMember;
}

export async function listAccountMembers(
  accountId: string,
  token: string | null,
): Promise<AccountMember[]> {
  const response = await apiRequest<ListMembersResponse>(
    `/api/accounts/${accountId}/members`,
    {},
    token,
  );
  return response.members;
}

export async function addAccountMember(
  accountId: string,
  email: string,
  role: AccountMemberRole,
  token: string | null,
): Promise<AccountMember> {
  const response = await apiRequest<AddMemberResponse>(
    `/api/accounts/${accountId}/members`,
    {
      method: "POST",
      body: JSON.stringify({ email, role }),
    },
    token,
  );
  return response.member;
}

export async function removeAccountMember(
  accountId: string,
  userId: string,
  token: string | null,
): Promise<void> {
  await apiRequest(
    `/api/accounts/${accountId}/members/${userId}`,
    { method: "DELETE" },
    token,
  );
}

export async function updateMemberRole(
  accountId: string,
  userId: string,
  role: AccountMemberRole,
  token: string | null,
): Promise<AccountMember> {
  const response = await apiRequest<AddMemberResponse>(
    `/api/accounts/${accountId}/members/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
    token,
  );
  return response.member;
}
