import type { InstrumentOption, InstrumentQuote } from "./types";

/** Free AMFI mirror: the whole scheme list, plus the latest NAV per scheme. */
const FUNDS_URL = "https://api.mfapi.in/mf";
const NAV_URL = "https://api.mfapi.in/mf";

/** The scheme list is ~12k rows and changes rarely, so it is fetched once per hour. */
const LIST_TTL_MS = 60 * 60 * 1000;

interface SchemeRow {
  schemeCode: number;
  schemeName: string;
}

interface NavResponse {
  meta?: {
    fund_house?: string;
    scheme_name?: string;
    scheme_category?: string;
  };
  data?: { date: string; nav: string }[];
}

let cache: { loadedAt: number; schemes: SchemeRow[] } | null = null;
let loading: Promise<SchemeRow[]> | null = null;

async function fetchSchemes(): Promise<SchemeRow[]> {
  const response = await fetch(FUNDS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`The fund list could not be loaded (${response.status}).`);
  }
  const rows = (await response.json()) as SchemeRow[];
  return rows.filter((row) => row?.schemeCode && row?.schemeName);
}

async function schemeList(): Promise<SchemeRow[]> {
  if (cache && Date.now() - cache.loadedAt < LIST_TTL_MS) return cache.schemes;
  loading ??= fetchSchemes()
    .then((schemes) => {
      cache = { loadedAt: Date.now(), schemes };
      return schemes;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Every word typed has to appear in the scheme name, so "parag flexi" finds the fund. */
function matches(name: string, words: string[]): boolean {
  const lower = name.toLowerCase();
  return words.every((word) => lower.includes(word));
}

export async function searchFunds(
  query: string,
  limit = 25,
): Promise<InstrumentOption[]> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const schemes = await schemeList();
  const source = words.length ? schemes.filter((s) => matches(s.schemeName, words)) : schemes;

  return source.slice(0, limit).map((scheme) => ({
    kind: "mutual-fund" as const,
    id: String(scheme.schemeCode),
    name: scheme.schemeName,
    detail: "Mutual fund",
  }));
}

export async function fundQuote(schemeCode: string): Promise<InstrumentQuote> {
  const response = await fetch(`${NAV_URL}/${encodeURIComponent(schemeCode)}/latest`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`No NAV came back for this fund (${response.status}).`);
  }

  const body = (await response.json()) as NavResponse;
  const latest = body.data?.[0];
  if (!latest) throw new Error("This fund has no published NAV yet.");

  return {
    kind: "mutual-fund",
    id: schemeCode,
    name: body.meta?.scheme_name ?? "",
    detail: [body.meta?.fund_house, body.meta?.scheme_category]
      .filter(Boolean)
      .join(" · "),
    price: Number(latest.nav),
    asOf: navDateToIso(latest.date),
  };
}

/** mfapi returns NAV dates as DD-MM-YYYY. */
function navDateToIso(date: string): string {
  const [day, month, year] = date.split("-");
  if (!day || !month || !year) return new Date().toISOString();
  return `${year}-${month}-${day}`;
}
