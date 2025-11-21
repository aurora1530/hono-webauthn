import prisma from "../../prisma.ts";
import { addHistory } from "./history.ts";
import type { PasskeyHistoryType } from "@prisma/client";
import inferClientPlatform from "./inferClientPlatform.ts";

type PostAuthParams = {
  savedPasskeyID: string;
  newCounter: number;
  backedUp: boolean;
  headers: Headers;
  authType: PasskeyHistoryType;
}

const handlePostAuthentication = ({
  savedPasskeyID,
  newCounter,
  backedUp,
  headers,
  authType,
}: PostAuthParams) => {
  return Promise.all([
    prisma.passkey.update({
      where: {
        id: savedPasskeyID,
      },
      data: {
        counter: newCounter,
        backedUp: backedUp,
      },
    }),
    addHistory({
      passkeyId: savedPasskeyID,
      ...inferClientPlatform(headers),
      authType,
    }),
  ]);
};

export default handlePostAuthentication;