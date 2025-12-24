import prisma from "../../prisma.js";

const buildConfirmationText = (username: string) => `delete ${username}`;

export const buildDeletionSummary = async (userId: string, username: string) => {
  try {
    const [ciphertextCount, passkeyCount, passkeyHistoryCount] = await Promise.all([
      prisma.prfCiphertext.count({
        where: { userID: userId },
      }),
      prisma.passkey.count({
        where: { userID: userId },
      }),
      prisma.passkeyHistory.count({
        where: {
          passkey: {
            userID: userId,
          },
        },
      }),
    ]);

    return {
      username,
      userId,
      ciphertextCount,
      passkeyCount,
      passkeyHistoryCount,
      confirmationText: buildConfirmationText(username),
    };
  } catch (error) {
    console.error("Failed to build deletion summary:", error);
    throw error;
  }
};
