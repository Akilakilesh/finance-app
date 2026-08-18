import { deriveAsset as deriveDebtAsset } from "./debt";
import { deriveEquityAsset } from "./equity";
import type { Asset } from "./types";

/** Recalculates the assets whose value comes from their own details rather than a typed in number. */
export function deriveAsset(asset: Asset): Asset {
  if (asset.equityDetails) return deriveEquityAsset(asset);
  return deriveDebtAsset(asset);
}
