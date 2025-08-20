import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

const MPM = 1609.344;

export async function GET(req: NextRequest) {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const zip = (searchParams.get("zip") || "").trim();
    const miles = Number(searchParams.get("miles"));
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 100), 1), 500);
    const unique = (searchParams.get("unique") ?? "true").toLowerCase() === "true";
    const milesClamped = Math.min(Math.max(miles, 1), 300);

    if (!zip || !Number.isFinite(miles)) {
      return NextResponse.json({ error: "Use ?zip=XXXXX&miles=YY" }, { status: 400 });
    }

    const sql = neon(url);

    // origin geom
    const originRows = await sql<{ geom: unknown }>`
      SELECT geom FROM zips WHERE zip = ${zip} LIMIT 1
    `;
    if (originRows.length === 0) {
      return NextResponse.json({ error: `ZIP ${zip} not found` }, { status: 404 });
    }
    const originGeom = originRows[0].geom;

    // DISTINCT ON (lat, lon) when unique=true
    const distinct = unique ? sql`DISTINCT ON (z.lat, z.lon)` : sql``;
    const orderPrefix = unique ? sql`z.lat, z.lon,` : sql``;

    const rows = await sql<{
      zip: string;
      city: string | null;
      state: string | null;
      distance_miles: string; // numeric returns as string
    }[]>`
      SELECT ${distinct}
        z.zip,
        z.city,
        z.state,
        ROUND((ST_Distance(z.geom, ${originGeom}::geography) / ${MPM})::numeric, 2) AS distance_miles
      FROM zips z
      WHERE ST_DWithin(z.geom, ${originGeom}::geography, ${milesClamped * MPM})
      ORDER BY ${orderPrefix} distance_miles
      LIMIT ${limit};
    `;

    return NextResponse.json({
      origin_zip: zip,
      miles: milesClamped,
      unique,
      count: rows.length,
      results: rows.map(r => ({ ...r, distance_miles: Number(r.distance_miles) })),
    });
  } catch (e) {
    console.error("ZIP/RADIUS ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
