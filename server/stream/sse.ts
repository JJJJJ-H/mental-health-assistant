export type SseEventName = "sources" | "delta" | "warning" | "done" | "error";

export function serializeSse(event: SseEventName, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
