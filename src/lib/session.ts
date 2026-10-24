import type { JsonObject } from "./json.js";

export type SessionID = string;

export interface SessionStore<T extends JsonObject> {
  createSessionWith(data: T): Promise<SessionID>;
  refresh(sessionID: SessionID): Promise<boolean>;
  get(sessionID: SessionID): Promise<T | undefined>;
  getAndDestroy(sessionID: SessionID): Promise<T | undefined>;
  // 失効済みセッションを再作成せず、存在するセッションだけを更新する。
  set(sessionID: SessionID, data: T): Promise<void>;
  destroy(sessionID: SessionID): Promise<void>;
}
