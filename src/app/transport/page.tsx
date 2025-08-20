"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

const fetcher = (url: string) => fetch(url).then(r => r.json());
function qs(obj: Record<string, any>) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); });
  return p.toString();
}

export default function TransportPage() {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [showCensus, setShowCensus] = useState(true);
  const [columnsSel, setColumnsSel] = useState<string[]>([]);

  const params = useMemo(() => ({ state, city, zip, limit, offset, columns: columnsSel.join(",") || undefined }), [state, city, zip, limit, offset, columnsSel]);
  const { data, error, isLoading, mutate } = useSWR(`/api/carriers?${qs(params)}`, fetcher, { keepPreviousData: true });

  const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const dynamicCols = useMemo<ColumnDef<any>[]>(() => {
    const first = rows[0] || {};
    return Object.keys(first).map((k) => ({
      header: k,
      accessorKey: k,
      cell: (info) => String(info.getValue() ?? ""),
    }));
  }, [rows]);

  const table = useReactTable({ data: rows, columns: dynamicCols, getCoreRowModel: getCoreRowModel() });

  const clear = () => { setState(""); setCity(""); setZip(""); setOffset(0); setColumnsSel([]); mutate(); };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Transport Data</h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div><label className="block text-sm font-medium">State</label>
          <input value={state} onChange={e=>setState(e.target.value)} placeholder="TN" className="border rounded w-full p-2" />
        </div>
        <div><label className="block text-sm font-medium">City</label>
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Knoxville" className="border rounded w-full p-2" />
        </div>
        <div><label className="block text-sm font-medium">ZIP</label>
          <input value={zip} onChange={e=>setZip(e.target.value)} placeholder="37934" className="border rounded w-full p-2" />
        </div>
        <div><label className="block text-sm font-medium">Limit</label>
          <input type="number" value={limit} min={1} max={500} onChange={e=>setLimit(Number(e.target.value))} className="border rounded w-full p-2" />
        </div>
        <div><label className="block text-sm font-medium">Offset</label>
          <input type="number" value={offset} min={0} onChange={e=>setOffset(Number(e.target.value))} className="border rounded w-full p-2" />
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={()=>{ setOffset(0); mutate(); }} className="px-3 py-2 rounded bg-blue-600 text-white">Apply</button>
          <button onClick={clear} className="px-3 py-2 rounded border">Clear</button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={showCensus} onChange={e=>setShowCensus(e.target.checked)} />
          <span>Show Carrier Census Data</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Columns:</span>
          <input value={columnsSel.join(",")}
            onChange={e=>setColumnsSel(e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}
            placeholder="usd_dot,legal_name,city,state,zip"
            className="border rounded p-2 w-[420px]" />
        </div>
      </div>

      <div className="border rounded overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} className="text-left p-2 border-b">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(r => (
              <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                {r.getVisibleCells().map(c => (
                  <td key={c.id} className="p-2 border-b align-top whitespace-pre">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-600 flex items-center gap-4">
        {isLoading && <span>Loading…</span>}
        {error && <span className="text-red-600">Error: {String(error)}</span>}
        <span>Rows: {rows.length}</span>
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-2 rounded border" onClick={()=> setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>Prev</button>
        <button className="px-3 py-2 rounded border" onClick={()=> setOffset(offset + limit)}>Next</button>
      </div>
    </div>
  );
}
