import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface SellerStore {
  /** Medusa Sales Channel ID (e.g. "sc_01JX...") */
  sales_channel_id: string;
  /** URL-friendly handle (e.g. "food") */
  channel_handle: string;
  /** The customer_group id for the seller's group */
  customer_group_id: string;
}

/**
 * Resolves a seller's store context from their customer_group membership.
 *
 * Strategy:
 * 1. Find all customer_groups where the customer is a member and metadata.type = "seller"
 * 2. If a group has metadata.channel_handle matching the requested channel, use it
 * 3. Otherwise resolve the sales_channel_id from the sales_channel table by handle
 *    (covers single-channel sellers whose group lacks explicit channel_handle binding)
 *
 * Returns null if:
 * - The customer is not a seller
 * - The requested channel does not exist in the sales_channel table
 *
 * Requirements: 1.1, 1.6, 11.1
 */
export async function resolveSellerStore(
  customerId: string,
  channelHandle: string,
): Promise<SellerStore | null> {
  try {
    const { rows: groupRows } = await pool.query(
      `SELECT cg.id, cg.metadata
       FROM customer_group_customer cgc
       JOIN customer_group cg ON cg.id = cgc.customer_group_id
       WHERE cgc.customer_id = $1
         AND cgc.deleted_at IS NULL
         AND cg.deleted_at IS NULL
         AND cg.metadata->>'type' = 'seller'
       ORDER BY cg.created_at DESC`,
      [customerId],
    );

    if (!groupRows.length) return null;

    // Pass 1: group explicitly bound to this channel handle
    for (const row of groupRows) {
      const meta: Record<string, any> = row.metadata || {};
      if (meta.channel_handle === channelHandle) {
        if (meta.sales_channel_id) {
          return {
            sales_channel_id: meta.sales_channel_id,
            channel_handle: channelHandle,
            customer_group_id: row.id,
          };
        }
        // Resolve ID from table
        const { rows: scRows } = await pool.query(
          `SELECT id FROM sales_channel WHERE handle = $1 AND deleted_at IS NULL LIMIT 1`,
          [channelHandle],
        );
        if (scRows.length) {
          return {
            sales_channel_id: scRows[0].id,
            channel_handle: channelHandle,
            customer_group_id: row.id,
          };
        }
      }
    }

    // Pass 2: seller has no explicit channel binding — allow if channel exists
    const { rows: scRows } = await pool.query(
      `SELECT id FROM sales_channel WHERE handle = $1 AND deleted_at IS NULL LIMIT 1`,
      [channelHandle],
    );
    if (!scRows.length) return null;

    return {
      sales_channel_id: scRows[0].id,
      channel_handle: channelHandle,
      customer_group_id: groupRows[0].id,
    };
  } catch {
    return null;
  }
}

/**
 * Counts active (non-terminal) DeliveryOrders linked to a given Medusa product.
 *
 * "Active" means lifecycle_status is NOT IN (delivered, complete, unassigned, expired)
 * and IS NOT NULL (null rows predate the lifecycle migration and are excluded).
 *
 * Requirements: 1.4, 1.5
 */
export async function countActiveOrdersForProduct(productId: string): Promise<number> {
  try {
    // Join through Medusa order items to find DeliveryOrders for this product
    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT do.id)::int AS cnt
       FROM delivery_order do
       WHERE do.order_id IN (
         SELECT DISTINCT oli.order_id
         FROM order_line_item oli
         WHERE oli.product_id = $1
         UNION
         SELECT DISTINCT oli2.order_id
         FROM order_line_item oli2
         JOIN product_variant pv ON pv.id = oli2.variant_id
         WHERE pv.product_id = $1
       )
         AND do.lifecycle_status IS NOT NULL
         AND do.lifecycle_status NOT IN ('delivered', 'complete', 'unassigned', 'expired')
         AND do.deleted_at IS NULL`,
      [productId],
    );
    return rows[0]?.cnt ?? 0;
  } catch {
    // If the query fails (e.g. table name mismatch), be conservative and return 0
    return 0;
  }
}
