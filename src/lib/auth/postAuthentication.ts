import type { PasskeyHistoryType } from "@prisma/client";
import prisma from "../../prisma.js";
import { addHistory } from "./history.js";
import inferClientPlatform from "./inferClientPlatform.js";

type PostAuthParams = {
  savedPasskeyID: string;
  newCounter: number;
  backedUp: boolean;
  headers: Headers;
  authType: PasskeyHistoryType;
};

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
