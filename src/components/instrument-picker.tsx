"use client";

import { useEffect, useRef, useState } from "react";
import { Field, TextInput } from "@/components/form";
import { Button } from "@/components/ui";
import { searchInstruments } from "@/lib/market/client";
import type { InstrumentKind, InstrumentOption } from "@/lib/market/types";

/** Typing keeps hitting the search route, so results are fetched a moment after the last keystroke. */
const DEBOUNCE_MS = 300;

export function InstrumentPicker({
  kind,
  label,
  hint,
  placeholder,
  selectedId,
  selectedName,
  onSelect,
  onClear,
}: {
  kind: InstrumentKind;
  label: string;
  hint?: string;
  placeholder?: string;
  selectedId: string;
  selectedName: string;
  onSelect: (option: InstrumentOption) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<InstrumentOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (selectedId) return;

    const id = ++requestId.current;
    // The search runs off the effect body so typing does not fire a request per keystroke.
    const timer = window.setTimeout(() => {
      // A fund search with no words still lists funds; a symbol search needs something to look up.
      if (!query.trim() && kind !== "mutual-fund") {
        setOptions([]);
        return;
      }
      setSearching(true);
      searchInstruments(kind, query)
        .then((results) => {
          if (id !== requestId.current) return;
          setOptions(results);
          setError("");
        })
        .catch((searchError: unknown) => {
          if (id !== requestId.current) return;
          setOptions([]);
          setError(
            searchError instanceof Error
              ? searchError.message
              : "The search failed.",
          );
        })
        .finally(() => {
          if (id === requestId.current) setSearching(false);
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [kind, query, selectedId]);

  if (selectedId) {
    return (
      <Field label={label}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-slate-900">{selectedName}</p>
            <p className="text-xs text-slate-500">{selectedId}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setQuery("");
              setOptions([]);
              onClear();
            }}
          >
            Change
          </Button>
        </div>
      </Field>
    );
  }

  return (
    <Field label={label} hint={hint}>
      <TextInput
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
        {error ? (
          <p className="px-3 py-2 text-sm text-rose-600">{error}</p>
        ) : options.length === 0 ? (
          <p className="px-3 py-2 text-sm text-slate-500">
            {searching
              ? "Searching…"
              : query.trim()
                ? "Nothing matched that search."
                : "Start typing to search."}
          </p>
        ) : (
          <ul>
            {options.map((option) => (
              <li key={`${option.kind}-${option.id}`}>
                <button
                  type="button"
                  onClick={() => onSelect(option)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="block font-medium text-slate-900">
                    {option.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {[option.id, option.detail].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}
