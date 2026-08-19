"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { valueEquityAsset, EQUITY_LABELS } from "@/lib/equity";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { fetchQuote } from "@/lib/market/client";
import { useStore } from "@/lib/store";
import type { Asset } from "@/lib/types";

/** How old a price may get before the page refreshes it on its own. */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

export function EquityCard({ asset }: { asset: Asset }) {
  const { updateAsset } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const details = asset.equityDetails;
  const assetId = asset.id;

  const refresh = useCallback(async () => {
    if (!details?.instrumentId) return;
    setRefreshing(true);
    try {
      const quote = await fetchQuote(details.kind, details.instrumentId);
      const updated = { ...details, currentPrice: quote.price, priceUpdatedAt: quote.asOf };
      await updateAsset(assetId, {
        equityDetails: updated,
        currentValue: valueEquityAsset(updated).currentValue,
      });
      setError("");
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "The price could not be refreshed.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [assetId, details, updateAsset]);

  const priceUpdatedAt = details?.priceUpdatedAt ?? "";
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const last = priceUpdatedAt ? Date.parse(priceUpdatedAt) : 0;
    if (Date.now() - last < STALE_AFTER_MS) return;
    // Started off the effect body so the first paint is not blocked by the lookup.
    const timer = window.setTimeout(() => void refreshRef.current(), 0);
    return () => window.clearTimeout(timer);
  }, [priceUpdatedAt]);

  if (!details) return null;

  const labels = EQUITY_LABELS[details.kind];
  const valuation = valueEquityAsset(details);
  const isFund = details.kind === "mutual-fund";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            {isFund ? "Fund holding" : "Market holding"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {details.instrumentName || details.instrumentId} · the value today is{" "}
            {labels.unitsLabel.toLowerCase()} × today&apos;s{" "}
            {isFund ? "NAV" : "price"}
            {priceUpdatedAt
              ? `, last fetched ${formatDateTime(priceUpdatedAt)}`
              : ""}
            .
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void refresh()}
          disabled={refreshing || !details.instrumentId}
        >
          {refreshing ? "Refreshing…" : `Refresh ${isFund ? "NAV" : "price"}`}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Row label={labels.unitsLabel} value={String(details.units)} />
        <Row
          label={labels.avgPriceLabel}
          value={formatCurrency(details.avgPrice)}
        />
        <Row
          label={labels.currentPriceLabel}
          value={
            details.currentPrice > 0 ? formatCurrency(details.currentPrice) : "—"
          }
        />
        <Row label="Total invested" value={formatCurrency(valuation.invested)} />
        <Row label="Current value" value={formatCurrency(valuation.currentValue)} />
        {isFund ? (
          <Row
            label="Investment mode"
            value={details.mode === "lumpsum" ? "Lump sum" : "SIP"}
          />
        ) : (
          <Row
            label="Dividend received"
            value={formatCurrency(details.dividendReceived ?? 0)}
          />
        )}
        {isFund && details.mode === "sip" ? (
          <>
            <Row label="SIP amount" value={formatCurrency(details.sipAmount ?? 0)} />
            <Row
              label="SIP date"
              value={details.sipDay ? `Day ${details.sipDay} of the month` : "—"}
            />
          </>
        ) : null}
        {isFund && details.folio ? (
          <Row label="Folio / account" value={details.folio} />
        ) : null}
        {details.investmentDate ? (
          <Row
            label={
              isFund && details.mode === "sip" ? "SIP started on" : "Invested on"
            }
            value={formatDate(details.investmentDate)}
          />
        ) : null}
      </div>

      {valuation.priceUnavailable ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No live {isFund ? "NAV" : "price"} is stored yet, so the value shown is
          the amount you put in.
        </p>
      ) : null}
    </Card>
  );
}
