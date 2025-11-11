import prisma from "../../prisma.ts";
import type { Passkey, PasskeyHistory } from "@prisma/client";

type HistoryParams = {
  passkeyId: string;
  browser: string;
  os: string;
};

export const addHistory = async ({ passkeyId, browser, os }: HistoryParams) => {
  try {
    await prisma.passkeyHistory.create({
      data: {
        passkeyID: passkeyId,
        usedBrowser: browser,
        usedOS: os,
      }
    })

  } catch (error) {
    console.error("Failed to add passkey history:", error);
  }
};

export const findHistories = async (passkeyIds: Passkey["id"][]): Promise<{
  [key: Passkey["id"]]: PasskeyHistory[];
}> => {
  const histories = await prisma.passkeyHistory.findMany({
    where: {
      passkeyID: {
        in: passkeyIds,
      },
    },
    orderBy: {
      usedAt: "desc",
    },
  });

  return histories.reduce((acc, history) => {
    if (!acc[history.passkeyID]) {
      acc[history.passkeyID] = [];
    }
    acc[history.passkeyID].push(history);
    return acc;
  }, {} as { [key: Passkey["id"]]: PasskeyHistory[] });
};
