import type { JsonObject } from "./json.ts";

export type SessionID = string;

export interface SessionStore<T extends JsonObject> {
  createSessionWith(data: T): Promise<SessionID>;
  refresh(sessionID: SessionID): Promise<boolean>;
  get(sessionID: SessionID): Promise<T | undefined>;
  getAndDestroy(sessionID: SessionID): Promise<T | undefined>;
  set(sessionID: SessionID, data: T): Promise<void>;
  destroy(sessionID: SessionID): Promise<void>;
}
