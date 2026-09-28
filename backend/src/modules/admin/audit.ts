import type { Executor } from "../../db/client.ts";
import { auditLogs } from "../../db/schema/index.ts";

/** Records who did what to which record. Call it inside the same transaction as the change. */
export async function audit(
  executor: Executor,
  actorId: string,
  action: string,
  entity: { type: string; id: string },
  meta?: Record<string, unknown>,
) {
  await executor.insert(auditLogs).values({ actorId, action, entityType: entity.type, entityId: entity.id, meta });
}
