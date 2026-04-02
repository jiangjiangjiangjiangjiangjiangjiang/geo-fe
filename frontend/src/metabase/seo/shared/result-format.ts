import type { BrandSentimentRecognitionResponse } from "metabase/api/seo";

type UnknownRecord = Record<string, unknown>;

const BRAND_KEYS = ["brand_name"];
const SENTIMENT_KEYS = ["sentiment"];
const EVIDENCE_KEYS = ["evidence"];

function getFirstStringValue(
  record: UnknownRecord,
  candidateKeys: string[],
): string {
  for (const key of candidateKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

function formatBrandSentimentItem(item: unknown): string {
  if (typeof item === "string") {
    return item.trim();
  }

  if (!item || typeof item !== "object") {
    return "";
  }

  const record = item as UnknownRecord;
  const brand = getFirstStringValue(record, BRAND_KEYS);
  const sentiment = getFirstStringValue(record, SENTIMENT_KEYS);
  const evidence = getFirstStringValue(record, EVIDENCE_KEYS);

  if (brand && sentiment && evidence) {
    return `${brand}: ${sentiment}（证据：${evidence}）`;
  }

  if (brand && sentiment) {
    return `${brand}: ${sentiment}`;
  }

  if (brand) {
    return brand;
  }

  if (sentiment) {
    return sentiment;
  }

  return "";
}

export function formatBrandSentimentResult(
  response: BrandSentimentRecognitionResponse,
): string {
  const formatted = response.brands
    .map(formatBrandSentimentItem)
    .filter(Boolean);
  if (formatted.length > 0) {
    return formatted.join("\n");
  }

  return "";
}
