import type { PasskeyHistoryType } from "@prisma/client";
import prisma from "../../prisma.js";

type HistoryParams = {
  passkeyId: string;
  browser: string;
  os: string;
  authType: PasskeyHistoryType;
};

export const addHistory = async ({ passkeyId, browser, os, authType }: HistoryParams) => {
  try {
    await prisma.passkeyHistory.create({
      data: {
        passkeyID: passkeyId,
        usedBrowser: browser,
        usedOS: os,
        type: authType,
      },
    });
  } catch (error) {
    console.error("Failed to add passkey history:", error);
  }
};
