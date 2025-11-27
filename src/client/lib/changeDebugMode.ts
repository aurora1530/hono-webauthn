import type { Result } from "@shared/type";
import { profileClient } from "./rpc/profileClient";

const changeDebugMode = async (to: boolean): Promise<Result<boolean, string>> => {
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
    value: to,
  };
};

export { changeDebugMode };
