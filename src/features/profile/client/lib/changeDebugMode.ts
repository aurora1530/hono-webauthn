import { profileClient } from "@shared/lib/rpc/profileClient.js";

const changeDebugMode = async (
  to: boolean,
): Promise<
  | {
      success: true;
      mode: boolean;
    }
  | {
      success: false;
      error: string;
    }
> => {
  const res = await profileClient["change-debug-mode"].$post({
    json: {
      debugMode: to,
    },
  });

  if (!res.ok) {
    return {
      success: false,
      error: (await res.json()).error || "Unknown error",
    };
  }
  return {
    success: true,
    mode: to,
  };
};

export { changeDebugMode };
