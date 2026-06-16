"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

type ImportResult = {
  ok?: boolean;
  disabled?: boolean;
  reason?: string;
  city?: string;
  fetched?: number;
  raw_saved?: number;
  created?: number;
  duplicates?: number;
  skipped?: number;
};

export default function TicketmasterImportButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState("");

  const runImport = async () => {
    setIsLoading(true);
    setMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/import/ticketmaster", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as ImportResult | null;

      if (!response.ok || !payload?.ok) {
        setMessage(payload?.reason ?? "Import non riuscito. Riprova tra poco.");
        return;
      }

      if (payload.disabled) {
        setMessage(payload.reason ?? "Import disattivato. Configura TICKETMASTER_API_KEY.");
      }

      setResult(payload);
    } catch {
      setMessage("Import non riuscito. Controlla la connessione e riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-import-panel">
      <div className="admin-card-heading">
        <h2>Import Ticketmaster</h2>
        <p className="admin-hint">
          Test manuale controllato: massimo 20 eventi, Milano con fallback New York.
        </p>
      </div>

      <button className="small-button save" type="button" onClick={runImport} disabled={isLoading}>
        <RefreshCw size={16} aria-hidden="true" />
        {isLoading ? "Import in corso..." : "Importa eventi test"}
      </button>

      {message ? <p className="form-message admin-import-message">{message}</p> : null}

      {result ? (
        <div className="admin-import-result" aria-live="polite">
          <span>
            <strong>Città</strong>
            {result.city ?? "-"}
          </span>
          <span>
            <strong>Creati</strong>
            {result.created ?? 0}
          </span>
          <span>
            <strong>Duplicati</strong>
            {result.duplicates ?? 0}
          </span>
          <span>
            <strong>Errori</strong>
            {result.skipped ?? 0}
          </span>
          <span>
            <strong>Raw</strong>
            {result.raw_saved ?? 0}
          </span>
        </div>
      ) : null}
    </div>
  );
}
