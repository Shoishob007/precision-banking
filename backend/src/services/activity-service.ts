import { pool } from "../db/pool.js";

interface ActivityRow {
  id: number;
  event_type: "transaction:created" | "balance:updated" | "transaction:failed";
  payload: Record<string, unknown>;
  created_at: string;
}

function mapStatus(eventType: ActivityRow["event_type"]) {
  if (eventType === "transaction:failed") {
    return "error";
  }

  return "success";
}

export async function listRecentActivity(userId: string, limit = 10) {
  const result = await pool.query<ActivityRow>(
    `
      SELECT DISTINCT ae.id, ae.event_type, ae.payload, ae.created_at
      FROM activity_events ae
      LEFT JOIN accounts a ON a.id = ae.account_id
      LEFT JOIN transactions t ON t.id = ae.transaction_id
      WHERE a.user_id = $1 OR t.initiated_by_user_id = $1
      ORDER BY ae.created_at DESC
      LIMIT $2
    `,
    [userId, limit],
  );

  return result.rows.map((row: ActivityRow) => ({
    id: row.id,
    type: row.event_type,
    timestamp: row.created_at,
    status: mapStatus(row.event_type),
    message: String(row.payload.message ?? row.event_type),
    metadata: row.payload.metadata ?? null,
    payload: row.payload,
  }));
}
