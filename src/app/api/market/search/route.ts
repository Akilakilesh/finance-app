import { NextResponse } from "next/server";
import { searchFunds } from "@/lib/market/funds";
import { searchStocks } from "@/lib/market/stocks";
import type { InstrumentKind } from "@/lib/market/types";
import { authErrorResponse, requireUnlockedUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const KINDS: InstrumentKind[] = ["mutual-fund", "stock", "etf"];

/** Fund and share lookup for the equity form; kept on the server so the keys and CORS stay here. */
export async function GET(request: Request) {
  try {
    await requireUnlockedUser();

    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") as InstrumentKind | null;
    const query = url.searchParams.get("q") ?? "";

    if (!kind || !KINDS.includes(kind)) {
      return NextResponse.json(
        { error: "Ask for kind=mutual-fund, kind=stock or kind=etf." },
        { status: 400 },
      );
    }

    const results =
      kind === "mutual-fund"
        ? await searchFunds(query)
        : await searchStocks(query, kind);

    return NextResponse.json({ results });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "The instrument search failed.",
        },
        { status: 502 },
      )
    );
  }
}
