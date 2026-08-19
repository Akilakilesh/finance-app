"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { ASSET_CATEGORIES, type Asset, type Goal } from "@/lib/types";

interface Group {
  categoryName: string;
  icon: string;
  types: { type: string; assets: Asset[] }[];
}

function groupAssets(assets: Asset[]): Group[] {
  return ASSET_CATEGORIES.map((category) => {
    const categoryAssets = assets.filter((a) => a.categoryId === category.id);
    const types = category.types
      .map((type) => ({
        type,
        assets: categoryAssets.filter((a) => a.type === type),
      }))
      .filter((group) => group.assets.length > 0);
    return { categoryName: category.name, icon: category.icon, types };
  }).filter((group) => group.types.length > 0);
}

export function AssetPicker({
  assets,
  goals,
  currentGoalId,
  selectedIds,
  onChange,
}: {
  assets: Asset[];
  goals: Goal[];
  currentGoalId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const groups = useMemo(() => groupAssets(assets), [assets]);
  const selected = new Set(selectedIds);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  function setMany(ids: string[], checked: boolean) {
    const next = new Set(selected);
    for (const id of ids) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    onChange([...next]);
  }

  function otherGoalsFor(assetId: string): string[] {
    return goals
      .filter((g) => g.id !== currentGoalId && g.linkedAssetIds.includes(assetId))
      .map((g) => g.name);
  }

  if (assets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You have no assets yet. Add an asset first, then link it to this goal.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.categoryName}>
          <p className="text-sm font-semibold text-foreground">
            <span aria-hidden>{group.icon}</span> {group.categoryName}
          </p>
          <div className="mt-2 space-y-3">
            {group.types.map(({ type, assets: typeAssets }) => {
              const ids = typeAssets.map((a) => a.id);
              const allSelected = ids.every((id) => selected.has(id));
              return (
                <div
                  key={type}
                  className="rounded-xl border border-border bg-muted/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{type}</p>
                    <button
                      type="button"
                      onClick={() => setMany(ids, !allSelected)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors select-none hover:bg-accent hover:text-foreground active:scale-[0.96]"
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {typeAssets.map((asset) => {
                      const others = otherGoalsFor(asset.id);
                      const isSelected = selected.has(asset.id);
                      return (
                        <li key={asset.id}>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors select-none active:scale-[0.99] ${
                              isSelected
                                ? "border-foreground/30 bg-card ring-1 ring-foreground/10"
                                : "border-transparent bg-card hover:border-border hover:bg-accent"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 size-4 accent-primary"
                              checked={isSelected}
                              onChange={() => toggle(asset.id)}
                            />
                            <span className="flex-1">
                              <span className="flex flex-wrap justify-between gap-2 text-sm text-foreground">
                                <span className="font-medium">{asset.name}</span>
                                <span>{formatCurrency(asset.currentValue)}</span>
                              </span>
                              {asset.institution ? (
                                <span className="block text-xs text-muted-foreground">
                                  {asset.institution}
                                </span>
                              ) : null}
                              {others.length > 0 ? (
                                <span className="block text-xs text-negative/80">
                                  Also used for: {others.join(", ")}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
