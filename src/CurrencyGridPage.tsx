import React, { useEffect, useMemo, useState } from "react";
import "./CurrencyGridPage.css";

// =============================================
// Currency Grid Page (React + TS)
// Wired to Spring Boot + PostgreSQL API
// =============================================
// This version replaces localStorage with real API calls.
// Search for:  CALL ▶ to see exactly where functions are invoked.

export type CurrencyRow = {
  id: string;
  name: string;
  symbol: string;
  buyPrice: number;
  sellPrice: number;
  fixing: number;
  updatedAt: string; // ISO
};

type UpsertPayload = {
  name: string;
  symbol: string;
  buyPrice: number;
  sellPrice: number;
  fixing: number;
};

// --- API client (adjust VITE_API_BASE or keep default) ---
const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080";
const CURRENCIES_URL = `${API_BASE}/api/currencies`;

async function handleJson<T>(res: Response): Promise<T> {
  if (res.ok) return res.json();
  let msg = `HTTP ${res.status}`;
  try {
    const data = await res.json();
    if (typeof data?.message === "string") msg = data.message;
  } catch {}
  throw new Error(msg);
}

async function listCurrencies(): Promise<CurrencyRow[]> {
  const r = await fetch(CURRENCIES_URL);
  return handleJson<CurrencyRow[]>(r);
}

async function createCurrency(body: UpsertPayload): Promise<CurrencyRow> {
  const r = await fetch(CURRENCIES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleJson<CurrencyRow>(r);
}

async function updateCurrency(id: string, body: UpsertPayload): Promise<CurrencyRow> {
  const r = await fetch(`${CURRENCIES_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleJson<CurrencyRow>(r);
}

async function deleteCurrency(id: string): Promise<void> {
  const r = await fetch(`${CURRENCIES_URL}/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

// --- helpers ---
function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const normalized = value.replace(/,/g, ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

const numberFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 });

export default function CurrencyGridPage() {
  const [rows, setRows] = useState<CurrencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for a new row
  const [form, setForm] = useState({ name: "", symbol: "", buyPrice: "", sellPrice: "", fixing: "" });

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; symbol: string; buyPrice: string; sellPrice: string; fixing: string } | null>(null);

  // ▶ CALL: Initial fetch from backend
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listCurrencies(); // CALL ▶ listCurrencies()
        setRows(data);
      } catch (e: any) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derived (optional): spread
  const withSpread = useMemo(() => rows.map((r) => ({ ...r, spread: r.sellPrice - r.buyPrice })), [rows]);

  // ---- Handlers ----
  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    const buy = parseNumber(form.buyPrice);
    const sell = parseNumber(form.sellPrice);
    const fix = parseNumber(form.fixing);

    if (!form.name.trim()) return alert("Name is required");
    if (!form.symbol.trim()) return alert("Symbol is required");
    if (buy === null) return alert("Buy price must be a number");
    if (sell === null) return alert("Sell price must be a number");
    if (fix === null) return alert("Fixing must be a number");

    const payload: UpsertPayload = {
      name: form.name.trim(),
      symbol: form.symbol.trim().toUpperCase(),
      buyPrice: buy,
      sellPrice: sell,
      fixing: fix,
    };

    try {
      setError(null);
      const created = await createCurrency(payload); // CALL ▶ createCurrency()
      setRows((prev) => [created, ...prev]);
      setForm({ name: "", symbol: "", buyPrice: "", sellPrice: "", fixing: "" });
    } catch (e: any) {
      setError(e.message || "Create failed");
    }
  }

  function startEdit(id: string) {
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    setEditingId(id);
    setEditDraft({ name: r.name, symbol: r.symbol, buyPrice: String(r.buyPrice), sellPrice: String(r.sellPrice), fixing: String(r.fixing) });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    const buy = parseNumber(editDraft.buyPrice);
    const sell = parseNumber(editDraft.sellPrice);
    const fix = parseNumber(editDraft.fixing);

    if (!editDraft.name.trim()) return alert("Name is required");
    if (!editDraft.symbol.trim()) return alert("Symbol is required");
    if (buy === null) return alert("Buy price must be a number");
    if (sell === null) return alert("Sell price must be a number");
    if (fix === null) return alert("Fixing must be a number");

    const payload: UpsertPayload = {
      name: editDraft.name.trim(),
      symbol: editDraft.symbol.trim().toUpperCase(),
      buyPrice: buy,
      sellPrice: sell,
      fixing: fix,
    };

    try {
      setError(null);
      const updated = await updateCurrency(id, payload); // CALL ▶ updateCurrency()
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      cancelEdit();
    } catch (e: any) {
      setError(e.message || "Update failed");
    }
  }

  async function removeRow(id: string) {
    if (!window.confirm("Delete this row?")) return;
    try {
      setError(null);
      await deleteCurrency(id); // CALL ▶ deleteCurrency()
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message || "Delete failed");
    }
  }

  async function refetch() {
    try {
      setLoading(true);
      setError(null);
      const data = await listCurrencies(); // CALL ▶ listCurrencies()
      setRows(data);
    } catch (e: any) {
      setError(e.message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  // particles for the background
  const particles = useMemo(() => Array.from({ length: 56 }).map(() => ({ top: Math.random() * 100, left: Math.random() * 100, delay: Math.random() * 3 })), []);

  return (
    <div className="ce-page">
      <div className="ce-particles" aria-hidden>
        {particles.map((p, i) => (
          <div key={i} className="ce-particle" style={{ top: `${p.top}%`, left: `${p.left}%`, animationDelay: `${p.delay}s` }} />
        ))}
      </div>

      <div className="ce-container">
        <div className="ce-gradient-frame">
          <div className="ce-gradient-blur" aria-hidden />
          <div className="ce-card">
            <div className="ce-card-glow" aria-hidden />

            <div className="ce-header">
              <h1>Currency Grid</h1>
              <p>Add currencies manually. Fixing = BNR value (enter it yourself).</p>
            </div>

            <div className="ce-stack">
              {/* ADD FORM */}
              <section className="ce-section">
                <div className="ce-section-title">Add currency</div>
                <form className="ce-form" onSubmit={addRow}>
                  <div className="ce-grid">
                    <div>
                      <div className="ce-label">Name</div>
                      <div className="ce-input-wrap">
                        <input className="ce-input" placeholder="Euro" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <div className="ce-label">Symbol</div>
                      <div className="ce-input-wrap">
                        <input className="ce-input" placeholder="EUR" value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))} />
                      </div>
                    </div>
                    <div>
                      <div className="ce-label">Buy price</div>
                      <div className="ce-input-wrap">
                        <input className="ce-input" inputMode="decimal" placeholder="4.95" value={form.buyPrice} onChange={(e) => setForm((f) => ({ ...f, buyPrice: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <div className="ce-label">Sell price</div>
                      <div className="ce-input-wrap">
                        <input className="ce-input" inputMode="decimal" placeholder="5.02" value={form.sellPrice} onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <div className="ce-label">Fixing (BNR)</div>
                      <div className="ce-input-wrap">
                        <input className="ce-input" inputMode="decimal" placeholder="4.97" value={form.fixing} onChange={(e) => setForm((f) => ({ ...f, fixing: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                    <button type="submit" className="ce-btn ce-btn-primary ce-submit">Add</button>
                  </div>
                </form>
              </section>

              {/* TABLE */}
              <section className="ce-section">
                <div className="ce-section-head">
                  <div className="ce-section-title" style={{ margin: 0 }}>Currencies</div>
                  <div>
                    <button className="ce-btn ce-btn-ghost" onClick={refetch} title="Refresh from server">Refresh</button>
                  </div>
                </div>

                {/* loading / error */}
                {loading && <div style={{ color: "#9ca3af", fontSize: 12 }}>Loading…</div>}
                {error && <div style={{ color: "#ef4444", fontSize: 12 }}>{error}</div>}

                <div className="ce-table">
                  {/* HEAD */}
                  <div className="ce-table-head">
                    <div className="ce-cell">Name</div>
                    <div className="ce-cell">Symbol</div>
                    <div className="ce-cell ce-cell--num">Buy price</div>
                    <div className="ce-cell ce-cell--num">Sell price</div>
                    <div className="ce-cell ce-cell--num">Fixing (BNR)</div>
                    <div className="ce-cell ce-cell--actions">Actions</div>
                  </div>

                  {/* ROWS */}
                  {withSpread.length === 0 && !loading ? (
                    <div className="ce-table-row">
                      <div className="ce-cell" style={{ gridColumn: "1 / -1", color: "#9ca3af", fontSize: 12 }}>No currencies yet. Add some above.</div>
                    </div>
                  ) : (
                    withSpread.map((r) => (
                      <div key={r.id} className="ce-table-row">
                        {/* Name */}
                        <div className="ce-cell">
                          {editingId === r.id ? (
                            <input className="ce-input" value={editDraft?.name ?? ""} onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))} />
                          ) : (
                            <span style={{ color: "#fff", fontWeight: 600 }}>{r.name}</span>
                          )}
                        </div>
                        {/* Symbol */}
                        <div className="ce-cell">
                          {editingId === r.id ? (
                            <input className="ce-input" value={editDraft?.symbol ?? ""} onChange={(e) => setEditDraft((d) => (d ? { ...d, symbol: e.target.value.toUpperCase() } : d))} />
                          ) : (
                            <span style={{ color: "#fff", textTransform: "uppercase" }}>{r.symbol}</span>
                          )}
                        </div>
                        {/* Buy */}
                        <div className="ce-cell ce-cell--num">
                          {editingId === r.id ? (
                            <input className="ce-input" inputMode="decimal" value={editDraft?.buyPrice ?? ""} onChange={(e) => setEditDraft((d) => (d ? { ...d, buyPrice: e.target.value } : d))} />
                          ) : (
                            <span>{numberFmt.format(r.buyPrice)}</span>
                          )}
                        </div>
                        {/* Sell */}
                        <div className="ce-cell ce-cell--num">
                          {editingId === r.id ? (
                            <input className="ce-input" inputMode="decimal" value={editDraft?.sellPrice ?? ""} onChange={(e) => setEditDraft((d) => (d ? { ...d, sellPrice: e.target.value } : d))} />
                          ) : (
                            <span>{numberFmt.format(r.sellPrice)}</span>
                          )}
                        </div>
                        {/* Fixing */}
                        <div className="ce-cell ce-cell--num">
                          {editingId === r.id ? (
                            <input className="ce-input" inputMode="decimal" value={editDraft?.fixing ?? ""} onChange={(e) => setEditDraft((d) => (d ? { ...d, fixing: e.target.value } : d))} />
                          ) : (
                            <span>{numberFmt.format(r.fixing)}</span>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="ce-cell ce-cell--actions">
                          {editingId === r.id ? (
                            <>
                              <button className="ce-btn ce-btn-primary" onClick={() => saveEdit(r.id)}>Save</button>
                              <button className="ce-btn ce-btn-ghost" onClick={cancelEdit}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="ce-btn ce-btn-ghost" onClick={() => startEdit(r.id)}>Edit</button>
                              <button className="ce-btn ce-btn-ghost" onClick={() => removeRow(r.id)} style={{ color: "#ef4444" }}>Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
