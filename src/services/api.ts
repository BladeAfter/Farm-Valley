import type { Farm, Command } from "../types/game";
export type Snapshot = { farm: Farm; persistent: boolean; storage?: "postgres" | "file"; serverTime: number };
async function request(path: string, body?: unknown): Promise<Snapshot> {
  const response = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
export async function connect() {
  let response = await fetch("/api/farm");
  if (response.status === 401) {
    await request("session", {});
    response = await fetch("/api/farm");
  }
  if (!response.ok) throw new Error("Não foi possível conectar ao servidor");
  return response.json() as Promise<Snapshot>;
}
export const command = (value: Command) => request("farm/command", value);
