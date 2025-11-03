export type SessionID = string;

export interface SessionStore<T extends Record<string, unknown>> {
  createSession(): Promise<SessionID>;
  refresh(sessionID: SessionID): Promise<boolean>;
  get(sessionID: SessionID): Promise<T | undefined>;
  set(sessionID: SessionID, data: T): Promise<void>;
  destroy(sessionID: SessionID): Promise<void>;
}
