import prisma from "../../prisma.ts";
import { addHistory } from "./history.ts";
import inferClientPlatform from "./inferClientPlatform.ts";

type PostAuthParams = {
  savedPasskeyID: string;
  newCounter: number;
  backedUp: boolean;
  headers: Headers;
}

const handlePostAuthentication = (
  { savedPasskeyID, newCounter, backedUp, headers }
    : PostAuthParams) => {
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
    }),
  ]);
};

export default handlePostAuthentication;