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
  const { brand, sentiment, evidence } = normalizeBrandSentimentItem(item);

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

function normalizeBrandSentimentItem(item: unknown): {
  brand: string;
  sentiment: string;
  evidence: string;
} {
  if (typeof item === "string") {
    return {
      brand: item.trim(),
      sentiment: "",
      evidence: "",
    };
  }

  if (!item || typeof item !== "object") {
    return {
      brand: "",
      sentiment: "",
      evidence: "",
    };
  }

  const record = item as UnknownRecord;
  return {
    brand: getFirstStringValue(record, BRAND_KEYS),
    sentiment: getFirstStringValue(record, SENTIMENT_KEYS),
    evidence: getFirstStringValue(record, EVIDENCE_KEYS),
  };
}

function getRecognizedBrandNames(
  response: BrandSentimentRecognitionResponse,
): string[] {
  const brandNames = response.brands
    .map((item) => normalizeBrandSentimentItem(item).brand)
    .filter(Boolean);

  return Array.from(new Set(brandNames));
}

export function getBrandSossValue(
  response: BrandSentimentRecognitionResponse,
): number | null {
  const recognizedBrandCount = getRecognizedBrandNames(response).length;
  if (recognizedBrandCount === 0) {
    return null;
  }

  return 1 / recognizedBrandCount;
}

export function formatBrandSossValue(
  response: BrandSentimentRecognitionResponse,
): string {
  const sossValue = getBrandSossValue(response);
  if (sossValue == null) {
    return "";
  }

  if (Number.isInteger(sossValue)) {
    return String(sossValue);
  }

  return sossValue.toFixed(4).replace(/\.?0+$/, "");
}

export function buildBrandSentimentExportColumns(
  response: BrandSentimentRecognitionResponse,
): Record<string, string> {
  return response.brands.reduce<Record<string, string>>(
    (columns, item, index) => {
      const { brand, sentiment, evidence } = normalizeBrandSentimentItem(item);
      const columnSuffix = index + 1;

      columns[`品牌${columnSuffix}`] = brand;
      columns[`情感${columnSuffix}`] = sentiment;
      columns[`证据${columnSuffix}`] = evidence;

      return columns;
    },
    {},
  );
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
