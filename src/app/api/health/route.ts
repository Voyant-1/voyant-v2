import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge"; // works great with Neon

export async function GET() {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) return NextResponse.json({ ok: false, reason: "no DATABASE_URL" }, { status: 500 });

    const sql = neon(url);
    const rows = await sql`select 1 as ok`;
    return NextResponse.json({ ok: true, db: rows[0] });
  } catch (e: any) {
    console.error("HEALTH ERROR:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
