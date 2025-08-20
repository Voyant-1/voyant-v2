import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Defensive JSON parse
    const text = await req.text();
    if (!text) return NextResponse.json({ error: "Missing JSON body" }, { status: 400 });

    let payload: any;
    try { payload = JSON.parse(text); } 
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const vins: string[] = Array.isArray(payload?.vins) ? payload.vins : [];
    if (vins.length === 0) return NextResponse.json({ error: "vins[] required" }, { status: 400 });

    // Build x-www-form-urlencoded with CRLF and format=json in the body
    const form = new URLSearchParams();
    form.set("DATA", vins.join("\r\n"));
    form.set("format", "json");

    // Timeout guard
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000); // 20s

    const upstream = await fetch(
      // Keep query format too, some infra respects one or the other
      "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch/?format=json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json", // <- force JSON
        },
        body: form.toString(),
        signal: controller.signal,
      }
    ).catch((e) => {
      throw new Error(`NHTSA fetch failed: ${e?.name || e}`);
    }) as Response;

    clearTimeout(timer);

    // Try JSON first; if XML still comes back, return it as text so the UI can show it
    const ct = upstream.headers.get("content-type") || "";
    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "NHTSA error", status: upstream.status, body: body.slice(0, 800) },
        { status: 502 }
      );
    }

    if (ct.includes("application/json")) {
      const data = await upstream.json();
      const res = NextResponse.json(data);
      res.headers.set("Cache-Control", "s-maxage=30");
      return res;
    } else {
      const xml = await upstream.text();
      // Fall back: surface the XML so you can still see results
      return NextResponse.json({ warning: "XML response from NHTSA", xml }, { status: 200 });
    }
  } catch (e: any) {
    console.error("[/api/vin/decode] error:", e?.message || e);
    return NextResponse.json(
      { error: "Server error", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
