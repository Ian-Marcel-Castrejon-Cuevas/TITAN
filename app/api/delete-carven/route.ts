import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PG_HOST || "192.168.8.55",
  port: parseInt(process.env.PG_PORT || "5432"),
  user: process.env.PG_USER || "asecon",
  password: process.env.PG_PASSWORD || "",
  database: process.env.PG_DATABASE || "asecon",
  ssl: false,
});

export async function POST() {
  try {
    const client = await pool.connect();
    await client.query(
      "DELETE FROM tbingresos WHERE infingreso >= CURRENT_DATE",
    );
    client.release();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false });
  }
}
