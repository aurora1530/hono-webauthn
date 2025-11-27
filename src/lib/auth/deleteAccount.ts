import prisma from "@infra/prisma.js";

const buildConfirmationText = (username: string) => `delete ${username}`;

export const buildDeletionSummary = async (userId: string, username: string) => {
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
};
