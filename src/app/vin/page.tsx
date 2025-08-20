"use client";

import { useState } from "react";

export default function VinDecoderPage() {
  const [vinInput, setVinInput] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleDecode() {
    setLoading(true);
    setResults(null);

    try {
      const vins = vinInput
        .split(/\s|,|\n/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      const res = await fetch("/api/vin/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vins }),
      });

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setResults({ error: "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>VIN Decoder Test</h1>
      <textarea
        placeholder="Enter one or more VINs (separated by space/comma/newline)"
        value={vinInput}
        onChange={(e) => setVinInput(e.target.value)}
        rows={5}
        style={{ width: "100%", marginBottom: "1rem" }}
      />
      <br />
      <button onClick={handleDecode} disabled={loading || !vinInput}>
        {loading ? "Decoding..." : "Decode VIN(s)"}
      </button>

      {results && (
        <pre
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#f0f0f0",
            borderRadius: "4px",
            maxHeight: "400px",
            overflow: "auto",
          }}
        >
          {JSON.stringify(results, null, 2)}
        </pre>
      )}
    </div>
  );
}
