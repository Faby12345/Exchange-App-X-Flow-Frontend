import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent } from "react";
import { User, MapPin, CreditCard, Hash, Plus, Trash2, DollarSign } from "lucide-react";
import { fetchCurrencies } from "./api/currencies";
import type { CurrencyDto } from "./types";
import "./SelingPage.css"; // if your file is actually "SellingPage.css", rename this import

/** Customer form fields */
interface FormData {
  firstName: string;
  lastName: string;
  cnp: string;
  country: string;
  series: string;
  number: string;
}

/** One exchange line in the form */
interface ExchangeRow {
  id: number;
  clientAmount: string;      // text input
  clientCurrencyId: string;  // UUID of currency
  exchangeRate: string;      // text input (auto-filled; editable)
  targetCurrencyId: string;  // UUID of currency
  convertedAmount: string;   // computed
}

/** If customers BUY from you -> use SELL price for the rate; if they SELL to you -> use BUY price */
const RATE_SOURCE: "sell" | "buy" = "sell";

/** API base for submit (fetchCurrencies already uses its own) */
const API = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080";

export default function CurrencyExchangePage() {
  // Backend currencies
  const [list, setList] = useState<CurrencyDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Customer form
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    cnp: "",
    country: "Romania",
    series: "",
    number: "",
  });

  // Exchange rows (first row seeded after currencies load)
  const [exchanges, setExchanges] = useState<ExchangeRow[]>([
    { id: 1, clientAmount: "", clientCurrencyId: "", exchangeRate: "", targetCurrencyId: "", convertedAmount: "" },
  ]);

  // ---- Load currencies once ----
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCurrencies(); // must return CurrencyDto[]: {id, name, symbol, buyPrice, sellPrice, fixing, updatedAt}
        data.sort((a, b) => a.symbol.localeCompare(b.symbol));
        setList(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load currencies");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Quick lookups
  const byId = useMemo(() => {
    const m = new Map<string, CurrencyDto>();
    for (const c of list) m.set(c.id, c);
    return m;
  }, [list]);

  // Seed the first row with defaults once list arrives (USD→RON if possible)
  useEffect(() => {
    if (list.length === 0) return;

    const usd = list.find((c) => c.symbol === "USD") ?? list[0];
    const ron = list.find((c) => c.symbol === "RON") ?? list[0];

    setExchanges((prev) =>
      prev.map((row) => {
        const from = row.clientCurrencyId || usd.id;
        const to = row.targetCurrencyId || ron.id;
        const picked = byId.get(from);
        const autoRate =
          picked ? (RATE_SOURCE === "sell" ? picked.sellPrice : picked.buyPrice) : undefined;
        const rate = row.exchangeRate || (autoRate != null ? String(autoRate) : "");
        const converted = computeConverted(row.clientAmount, rate);
        return {
          ...row,
          clientCurrencyId: from,
          targetCurrencyId: to,
          exchangeRate: rate,
          convertedAmount: converted,
        };
      })
    );
  }, [list, byId]);

  // ---- Handlers ----
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  function computeConverted(amountStr: string, rateStr: string): string {
    const amt = Number((amountStr ?? "").replace(",", "."));
    const rate = Number((rateStr ?? "").replace(",", "."));
    if (!Number.isFinite(amt) || !Number.isFinite(rate)) return "";
    return (amt * rate).toFixed(2);
  }

  function handleExchangeChange(
    id: number,
    field: "clientAmount" | "clientCurrencyId" | "targetCurrencyId" | "exchangeRate",
    value: string
  ) {
    setExchanges((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        let next: ExchangeRow = { ...row, [field]: value };

        // Auto-fill rate when "From" changes
        if (field === "clientCurrencyId") {
          const picked = byId.get(value);
          if (picked) {
            const autoRate = RATE_SOURCE === "sell" ? picked.sellPrice : picked.buyPrice;
            next.exchangeRate = String(autoRate);
          }
        }

        // Recompute converted on amount/rate/from changes
        if (field === "clientAmount" || field === "exchangeRate" || field === "clientCurrencyId") {
          next.convertedAmount = computeConverted(next.clientAmount, next.exchangeRate);
        }

        return next;
      })
    );
  }

  const addExchange = () => {
    const nextId = exchanges.length ? Math.max(...exchanges.map((r) => r.id)) + 1 : 1;
    const usd = list.find((c) => c.symbol === "USD") ?? list[0];
    const ron = list.find((c) => c.symbol === "RON") ?? list[0];
    const autoRate = usd ? (RATE_SOURCE === "sell" ? usd.sellPrice : usd.buyPrice) : undefined;

    setExchanges((prev) => [
      ...prev,
      {
        id: nextId,
        clientAmount: "",
        clientCurrencyId: usd?.id ?? "",
        exchangeRate: autoRate != null ? String(autoRate) : "",
        targetCurrencyId: ron?.id ?? "",
        convertedAmount: "",
      },
    ]);
  };

  const removeExchange = (id: number) => {
    setExchanges((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  };

  const toDec = (s: string) => {
    const n = Number((s ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Build a backend-friendly payload (IDs + numbers)
    const rows = exchanges.map((r) => ({
      amount: toDec(r.clientAmount),
      rate: toDec(r.exchangeRate),
      fromCurrencyId: r.clientCurrencyId,
      toCurrencyId: r.targetCurrencyId,
    }));

    const payload = {
      customer: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        cnp: formData.cnp,
        country: formData.country,
        series: formData.series,
        number: formData.number,
      },
      rows,
    };

    try {
      const res = await fetch(`${API}/api/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("POST /api/exchange failed:", res.status, text);
        alert(`Exchange failed (${res.status}). ${text || ""}`);
        return;
      }

      const data = await res.json();
      console.log("Server response:", data);

      // If server returns recalculated amounts, merge them in
      if (Array.isArray((data as any).rows)) {
        setExchanges((prev) =>
          prev.map((row, i) => ({
            ...row,
            convertedAmount: (data as any).rows[i]?.convertedAmount ?? row.convertedAmount,
          }))
        );
      }
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Something went wrong submitting the form.");
    }
  };

  // ---- UI ----
  return (
    <div className="ce-page">
      {/* Animated background particles */}
      <div className="ce-particles">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="ce-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main container */}
      <div className="ce-container">
        <div className="ce-gradient-frame">
          <div className="ce-gradient-blur" />
          <div className="ce-card">
            <div className="ce-card-glow" />

            {/* ----------------- FORM ----------------- */}
            <form className="ce-form" onSubmit={handleSubmit}>
              {/* Header */}
              <div className="ce-header">
                <h1>Currency Exchange - Selling / Buying</h1>
                <p>Complete your exchange transaction</p>
                {error && (
                  <p style={{ color: "#ef4444", marginTop: 8 }}>
                    Failed to load currencies: {error}
                  </p>
                )}
              </div>

              <div className="ce-stack">
                {/* Personal Info */}
                <div className="ce-section">
                  <h3 className="ce-section-title">Personal Information</h3>

                  <div className="ce-grid">
                    <div>
                      <div className="ce-label">First Name</div>
                      <div className="ce-input-wrap">
                        <User size={16} className="ce-icon" />
                        <input
                          type="text"
                          name="firstName"
                          placeholder="First Name"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="ce-input"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="ce-label">Last Name</div>
                      <div className="ce-input-wrap">
                        <User size={16} className="ce-icon" />
                        <input
                          type="text"
                          name="lastName"
                          placeholder="Last Name"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="ce-input"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="ce-label">CNP (13 digits)</div>
                      <div className="ce-input-wrap">
                        <Hash size={16} className="ce-icon" />
                        <input
                          type="text"
                          name="cnp"
                          placeholder="CNP (Romanian Personal Code)"
                          value={formData.cnp}
                          onChange={handleInputChange}
                          className="ce-input"
                          maxLength={13}
                          pattern="[0-9]{13}"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="ce-label">Country</div>
                      <div className="ce-input-wrap">
                        <MapPin size={16} className="ce-icon" />
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="ce-input ce-select"
                          required
                        >
                          <option value="Romania">Romania</option>
                          <option value="Germany">Germany</option>
                          <option value="France">France</option>
                          <option value="Italy">Italy</option>
                          <option value="Spain">Spain</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="ce-label">ID Series (2 letters)</div>
                      <div className="ce-input-wrap">
                        <CreditCard size={16} className="ce-icon" />
                        <input
                          type="text"
                          name="series"
                          placeholder="ID Series (e.g., RX)"
                          value={formData.series}
                          onChange={handleInputChange}
                          className="ce-input"
                          maxLength={2}
                          pattern="[A-Za-z]{2}"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="ce-label">ID Number (6 digits)</div>
                      <div className="ce-input-wrap">
                        <Hash size={16} className="ce-icon" />
                        <input
                          type="text"
                          name="number"
                          placeholder="ID Number"
                          value={formData.number}
                          onChange={handleInputChange}
                          className="ce-input"
                          maxLength={6}
                          pattern="[0-9]{6}"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exchange Details */}
                <div className="ce-section">
                  <div className="ce-section-head">
                    <h3 className="ce-section-title">Exchange Details</h3>
                    <button
                      type="button"
                      onClick={addExchange}
                      className="ce-btn ce-btn-primary"
                      disabled={loading || list.length === 0}
                    >
                      <Plus size={16} /> Add Exchange
                    </button>
                  </div>

                  <div className="ce-table">
                    <div className="ce-table-head">
                      <span>Client Amount</span>
                      <span>From</span>
                      <span>Rate</span>
                      <span>To</span>
                      <span>Converted</span>
                      <span>Action</span>
                    </div>

                    {exchanges.map((exchange) => (
                      <div key={exchange.id} className="ce-table-row">
                        {/* Amount */}
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={exchange.clientAmount}
                          onChange={(e) =>
                            handleExchangeChange(exchange.id, "clientAmount", e.target.value)
                          }
                          className="ce-input"
                        />

                        {/* From currency (auto-fills rate) */}
                        <select
                          value={exchange.clientCurrencyId}
                          onChange={(e) =>
                            handleExchangeChange(exchange.id, "clientCurrencyId", e.target.value)
                          }
                          className="ce-input ce-select"
                          required
                          disabled={loading || list.length === 0}
                        >
                          <option value="" disabled>
                            {loading
                              ? "Loading..."
                              : list.length
                              ? "Select currency"
                              : "No currencies — add in Grid"}
                          </option>
                          {list.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.symbol}
                            </option>
                          ))}
                        </select>

                        {/* Rate (auto-filled, editable) */}
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="0.0000"
                          value={exchange.exchangeRate}
                          onChange={(e) =>
                            handleExchangeChange(exchange.id, "exchangeRate", e.target.value)
                          }
                          className="ce-input"
                        />

                        {/* To currency */}
                        <input
                          type="text"
                          value="RON"
                          readOnly
                          placeholder="Auto-calculated"
                          className="ce-input ce-readonly"
                        />

                        {/* Converted (read-only) */}
                        <input
                          type="text"
                          value={exchange.convertedAmount}
                          readOnly
                          placeholder="Auto-calculated"
                          className="ce-input ce-readonly"
                        />

                        {/* Remove row */}
                        <button
                          type="button"
                          onClick={() => removeExchange(exchange.id)}
                          className="ce-btn ce-btn-ghost"
                          disabled={exchanges.length === 1}
                          title={
                            exchanges.length === 1
                              ? "At least one row is required"
                              : "Remove row"
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="ce-btn ce-btn-primary ce-submit"
                  //disabled={loading || list.length === 0}
                >
                  <DollarSign size={20} /> Process Exchange
                </button>
              </div>
            </form>
            {/* --------------- END FORM --------------- */}
          </div>
        </div>
      </div>
    </div>
  );
}
