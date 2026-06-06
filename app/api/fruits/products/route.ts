import { NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://medusa_user:Saanvi02052016%40@localhost:5432/medusa_digitalrohtak";

export async function GET() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();

    const { rows: products } = await client.query(`
      SELECT p.id, p.title, p.subtitle, p.handle, p.metadata
      FROM product p
      JOIN product_sales_channel psc ON psc.product_id = p.id
      WHERE psc.sales_channel_id = 'sc_fruits_digitalrohtak'
        AND p.status = 'published'
        AND p.deleted_at IS NULL
      ORDER BY p.title
    `);

    const { rows: categories } = await client.query(`
      SELECT id, name, handle
      FROM product_category
      WHERE id IN ('pcat_whole_fruits', 'pcat_chopped_fruits')
        AND deleted_at IS NULL
      ORDER BY rank
    `);

    return NextResponse.json({ products, categories });
  } catch (err: any) {
    return NextResponse.json({ products: [], categories: [], error: err.message }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
