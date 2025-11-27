import type { Result } from "@shared/type.js";
import { profileClient } from "./rpc/profileClient.js";

export type AccountDeletionSummary = {
  username: string;
  userId: string;
  ciphertextCount: number;
  passkeyCount: number;
  passkeyHistoryCount: number;
  confirmationText: string;
};

export const fetchAccountDeletionSummary = async (): Promise<
  Result<AccountDeletionSummary, string>
> => {
  try {
    const res = await profileClient["account-deletion"].summary.$get();
    if (!res.ok) {
      return { success: false, error: (await res.json()).error || "Unknown error" };
    }
    const data = await res.json();
    return { success: true, value: data };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to fetch deletion summary" };
  }
};

export const deleteAccount = async (
  confirmationText: string,
): Promise<Result<{ rpId: string; credentialIds: string[] }, string>> => {
  try {
    const res = await profileClient["delete-account"].$post({
      json: { confirmationText },
    });
    if (!res.ok) {
      return { success: false, error: (await res.json()).error || "Unknown error" };
    }
    const { rpId, credentialIds } = await res.json();
    return { success: true, value: { rpId, credentialIds } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete account" };
  }
};
