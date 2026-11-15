import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function writeAudit(input: {
  actorType?: "admin" | "customer" | "system" | "webhook";
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    actorType: input.actorType ?? "system",
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
}
