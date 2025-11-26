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
  { success: true; summary: AccountDeletionSummary } | { success: false; error: string }
> => {
  try {
    const res = await profileClient["account-deletion"].summary.$get();
    if (!res.ok) {
      return { success: false, error: (await res.json()).error || "Unknown error" };
    }
    const data = await res.json();
    return { success: true, summary: data };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to fetch deletion summary" };
  }
};

export const deleteAccount = async (
  confirmationText: string,
): Promise<
  { success: true; rpId: string; credentialIds: string[] } | { success: false; error: string }
> => {
  try {
    const res = await profileClient["delete-account"].$post({
      json: { confirmationText },
    });
    if (!res.ok) {
      return { success: false, error: (await res.json()).error || "Unknown error" };
    }
    const { rpId, credentialIds } = await res.json();
    return { success: true, rpId, credentialIds };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete account" };
  }
};
