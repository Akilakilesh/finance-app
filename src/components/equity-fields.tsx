"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Field, Select, TextInput } from "@/components/form";
import { InstrumentPicker } from "@/components/instrument-picker";
import { Button } from "@/components/ui";
import {
  averagePriceFrom,
  EQUITY_LABELS,
  valueEquityAsset,
  type EquityDetails,
  type EquityKind,
  type InvestmentMode,
} from "@/lib/equity";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { fetchQuote } from "@/lib/market/client";

export type EquityValues = Record<string, string>;

export function defaultEquityValues(kind: EquityKind): EquityValues {
  return {
    instrumentId: "",
    instrumentName: "",
    units: "",
    avgPrice: "",
    investedAmount: "",
    currentPrice: "",
    priceUpdatedAt: "",
    mode: kind === "mutual-fund" ? "sip" : "lumpsum",
    sipAmount: "",
    sipDay: "",
    folio: "",
    dividendReceived: "",
    investmentDate: "",
  };
}

export function equityValuesFromDetails(details: EquityDetails): EquityValues {
  const values = defaultEquityValues(details.kind);
  for (const [key, value] of Object.entries(details)) {
    if (key === "kind" || value === undefined) continue;
    values[key] = String(value);
  }
  return values;
}

function num(values: EquityValues, key: string): number {
  const parsed = Number(values[key]);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Applies a change and keeps units, average price and the invested amount in
 * step: the third number is always worked out from the two the user typed.
 */
export function applyEquityPatch(
  values: EquityValues,
  patch: EquityValues,
): EquityValues {
  const next = { ...values, ...patch };
  const units = num(next, "units");

  if (patch.avgPrice !== undefined) {
    next.investedAmount = units > 0 && num(next, "avgPrice") > 0
      ? String(Math.round(units * num(next, "avgPrice") * 100) / 100)
      : next.investedAmount;
    return next;
  }

  if (patch.units !== undefined || patch.investedAmount !== undefined) {
    if (num(next, "investedAmount") > 0) {
      next.avgPrice = String(averagePriceFrom(num(next, "investedAmount"), units));
    } else if (num(next, "avgPrice") > 0 && units > 0) {
      next.investedAmount = String(
        Math.round(units * num(next, "avgPrice") * 100) / 100,
      );
    }
  }

  return next;
}

export function buildEquityDetails(
  kind: EquityKind,
  values: EquityValues,
): EquityDetails {
  const details: EquityDetails = {
    kind,
    instrumentId: values.instrumentId ?? "",
    instrumentName: values.instrumentName ?? "",
    units: num(values, "units"),
    avgPrice: num(values, "avgPrice"),
    investedAmount: num(values, "investedAmount"),
    currentPrice: num(values, "currentPrice"),
    priceUpdatedAt: values.priceUpdatedAt ?? "",
    investmentDate: values.investmentDate ?? "",
  };

  if (kind === "mutual-fund") {
    details.mode = (values.mode === "lumpsum" ? "lumpsum" : "sip") as InvestmentMode;
    details.folio = values.folio ?? "";
    if (details.mode === "sip") {
      details.sipAmount = num(values, "sipAmount");
      details.sipDay = num(values, "sipDay");
    }
  } else {
    details.dividendReceived = num(values, "dividendReceived");
  }

  return details;
}

export function EquityFields({
  kind,
  values,
  onPatch,
}: {
  kind: EquityKind;
  values: EquityValues;
  onPatch: (patch: EquityValues) => void;
}) {
  const labels = EQUITY_LABELS[kind];
  const [priceError, setPriceError] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const instrumentId = values.instrumentId ?? "";

  // Kept in a ref so refreshing a price does not depend on the parent's render.
  const onPatchRef = useRef(onPatch);
  useEffect(() => {
    onPatchRef.current = onPatch;
  }, [onPatch]);

  const refreshPrice = useCallback(
    async (id: string) => {
      if (!id) return;
      setLoadingPrice(true);
      try {
        const quote = await fetchQuote(kind, id);
        setPriceError("");
        onPatchRef.current({
          currentPrice: String(quote.price),
          priceUpdatedAt: quote.asOf,
          ...(quote.name ? { instrumentName: quote.name } : {}),
        });
      } catch (error) {
        setPriceError(
          error instanceof Error ? error.message : "The price lookup failed.",
        );
      } finally {
        setLoadingPrice(false);
      }
    },
    [kind],
  );

  // A holding opened for editing shows the price it was saved with until this lands.
  useEffect(() => {
    if (!instrumentId) return;
    const timer = window.setTimeout(() => void refreshPrice(instrumentId), 0);
    return () => window.clearTimeout(timer);
  }, [instrumentId, refreshPrice]);

  const details = buildEquityDetails(kind, values);
  const valuation = valueEquityAsset(details);
  const isFund = kind === "mutual-fund";
  const isSip = isFund && values.mode !== "lumpsum";

  return (
    <div className="space-y-4">
      <InstrumentPicker
        kind={kind}
        label={labels.instrumentLabel}
        hint={labels.instrumentHint}
        placeholder={labels.searchPlaceholder}
        selectedId={instrumentId}
        selectedName={values.instrumentName ?? ""}
        onSelect={(option) =>
          onPatch({ instrumentId: option.id, instrumentName: option.name })
        }
        onClear={() =>
          onPatch({
            instrumentId: "",
            instrumentName: "",
            currentPrice: "",
            priceUpdatedAt: "",
          })
        }
      />

      {isFund ? (
        <Field label="Investment mode">
          <Select
            value={values.mode ?? "sip"}
            onChange={(e) => onPatch({ mode: e.target.value })}
          >
            <option value="sip">SIP (every month)</option>
            <option value="lumpsum">Lump sum (one time)</option>
          </Select>
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.unitsLabel}>
          <TextInput
            type="number"
            min="0"
            step="any"
            value={values.units ?? ""}
            placeholder="0"
            onChange={(e) => onPatch({ units: e.target.value })}
          />
        </Field>

        <Field label="Total invested amount (₹)">
          <TextInput
            type="number"
            min="0"
            step="any"
            value={values.investedAmount ?? ""}
            placeholder="0"
            onChange={(e) => onPatch({ investedAmount: e.target.value })}
          />
        </Field>

        <Field
          label={labels.avgPriceLabel}
          hint="Filled in from the amount you put in — change it if you know it"
        >
          <TextInput
            type="number"
            min="0"
            step="any"
            value={values.avgPrice ?? ""}
            placeholder="0"
            onChange={(e) => onPatch({ avgPrice: e.target.value })}
          />
        </Field>

        <Field
          label={labels.currentPriceLabel}
          hint={
            values.priceUpdatedAt
              ? `As of ${formatDateTime(values.priceUpdatedAt)}`
              : "Fetched when you pick the instrument"
          }
        >
          <div className="flex gap-2">
            <TextInput
              type="number"
              min="0"
              step="any"
              value={values.currentPrice ?? ""}
              placeholder="0"
              onChange={(e) => onPatch({ currentPrice: e.target.value })}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!instrumentId || loadingPrice}
              onClick={() => void refreshPrice(instrumentId)}
            >
              {loadingPrice ? "…" : "Refresh"}
            </Button>
          </div>
        </Field>

        {isFund ? (
          <Field label="Folio / account name" hint="Optional">
            <TextInput
              value={values.folio ?? ""}
              placeholder="Folio number"
              onChange={(e) => onPatch({ folio: e.target.value })}
            />
          </Field>
        ) : (
          <Field label="Dividend received (₹)" hint="Optional">
            <TextInput
              type="number"
              min="0"
              step="any"
              value={values.dividendReceived ?? ""}
              placeholder="0"
              onChange={(e) => onPatch({ dividendReceived: e.target.value })}
            />
          </Field>
        )}

        {isSip ? (
          <>
            <Field label="SIP amount (₹)">
              <TextInput
                type="number"
                min="0"
                step="any"
                value={values.sipAmount ?? ""}
                placeholder="5000"
                onChange={(e) => onPatch({ sipAmount: e.target.value })}
              />
            </Field>
            <Field label="SIP date" hint="Day of the month it is debited">
              <TextInput
                type="number"
                min="1"
                max="31"
                step="1"
                value={values.sipDay ?? ""}
                placeholder="5"
                onChange={(e) => onPatch({ sipDay: e.target.value })}
              />
            </Field>
          </>
        ) : null}

        <Field label={isSip ? "SIP started on" : "Investment date"}>
          <TextInput
            type="date"
            value={values.investmentDate ?? ""}
            onChange={(e) => onPatch({ investmentDate: e.target.value })}
          />
        </Field>
      </div>

      {priceError ? (
        <p className="rounded-lg border border-negative/20 bg-negative/10 px-3 py-2 text-sm text-negative">
          {priceError} You can still type the {isFund ? "NAV" : "price"} in
          yourself.
        </p>
      ) : null}

      <div className="rounded-xl border border-border bg-muted/60 p-4">
        <p className="text-sm font-medium text-foreground">
          Calculated for you — you do not enter the value today
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Money put in</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(valuation.invested)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current value</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(valuation.currentValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profit / loss</p>
            <p
              className={`text-lg font-semibold ${
                valuation.profit >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {formatCurrency(valuation.profit)}
            </p>
          </div>
        </div>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {valuation.explanation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
