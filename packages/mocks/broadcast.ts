import { EventEmitter } from "node:events";

export interface BroadcastMessage {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
}

export const broadcastEmitter = new EventEmitter();
