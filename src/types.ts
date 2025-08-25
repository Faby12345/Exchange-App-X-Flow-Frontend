// src/types.ts
export type CurrencyDto = {
  id: string;
  name: string;
  symbol: string;
  buyPrice: number;   // BigDecimal -> JSON number
  sellPrice: number;
  fixing: number;
  updatedAt: string;  // Instant -> ISO string (e.g. "2025-08-22T11:00:00Z")
};
