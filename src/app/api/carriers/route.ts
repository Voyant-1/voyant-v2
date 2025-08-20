import { NextRequest, NextResponse } from 'next/server';

function sodaWhere(q: string) {
  if (!q) return '';
  return isNaN(Number(q))
    ? `upper(legal_name) like upper('%25${encodeURIComponent(q)}%25')`
    : `dot_number=${q}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ?? '100';
    const offset = searchParams.get('offset') ?? '0';
    const q = searchParams.get('q') ?? '';
    const where = sodaWhere(q);

    const base = 'https://data.transportation.gov/resource/az4n-8mr2.json';
    const url = `${base}?$limit=${limit}&$offset=${offset}${
      where ? `&$where=${where}` : ''
    }`;

    const upstream = await fetch(url, {
      headers: process.env.SOCRATA_APP_TOKEN
        ? { 'X-App-Token': process.env.SOCRATA_APP_TOKEN }
        : {},
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }

    const data = await upstream.json();

    const res = NextResponse.json({ data });
    // Cache at the CDN for 120s; allow SWR 10m
    res.headers.set('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}