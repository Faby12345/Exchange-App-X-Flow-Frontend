import type { CurrencyDto } from '../types';
const API =  (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080";

export async function fetchCurrencies(): Promise<CurrencyDto[]> {
  const response = await fetch(`${API}/api/currencies`);
  if (!response.ok) {
    throw new Error(`Failed to fetch currencies: ${response.statusText}`);
  }
  return response.json();
}