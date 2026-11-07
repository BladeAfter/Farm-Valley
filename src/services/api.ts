import type { Farm, Command } from "../types/game";
import { t } from "../i18n/core";
import { errorInfo } from "../i18n/errors";
export class ApiError extends Error {
  constructor(readonly code: string, readonly params: Record<string,string|number> = {}) { super(t(code,params)); }
}
export type Snapshot = { farm: Farm; persistent: boolean; storage?: "postgres" | "file"; serverTime: number };
async function request(path: string, body?: unknown): Promise<Snapshot> {
  const response = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) { const info=data.code?{code:data.code,params:data.params??{}}:errorInfo(data.error??"");throw new ApiError(info.code,info.params); }
  return data;
}
export async function connect() {
  let response = await fetch("/api/farm");
  if (response.status === 401) {
    await request("session", {});
    response = await fetch("/api/farm");
  }
  if (!response.ok) throw new ApiError("errors.network");
  return response.json() as Promise<Snapshot>;
}
export const command = (value: Command) => request("farm/command", value);
