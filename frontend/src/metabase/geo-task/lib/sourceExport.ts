import { t } from "ttag";

import type { SourceItem } from "metabase/api/geo-task";

interface CellPosition {
  r: number;
  c: number;
}

export interface CellRange {
  s: CellPosition;
  e: CellPosition;
}

function groupSourcesByResultId(items: SourceItem[]): SourceItem[][] {
  const groupedSources = new Map<number, SourceItem[]>();

  items.forEach((source) => {
    const sources = groupedSources.get(source.result_id);

    if (sources) {
      sources.push(source);
    } else {
      groupedSources.set(source.result_id, [source]);
    }
  });

  return Array.from(groupedSources.values());
}

export function buildSourceExportRows(items: SourceItem[]) {
  return groupSourcesByResultId(items).flatMap((sources) =>
    sources.map((source) => ({
      [t`Result ID`]: source.result_id,
      [t`Title`]: source.title ?? "",
      [t`URL`]: source.url ?? "",
    })),
  );
}

export function buildSourceExportMerges(items: SourceItem[]): CellRange[] {
  let firstRow = 1;

  return groupSourcesByResultId(items).flatMap((sources) => {
    const lastRow = firstRow + sources.length - 1;
    const merge =
      sources.length > 1
        ? [{ s: { r: firstRow, c: 0 }, e: { r: lastRow, c: 0 } }]
        : [];

    firstRow = lastRow + 1;
    return merge;
  });
}

export function buildSourceExportFileName(
  taskId: string,
  batchId: number | undefined,
  page: number,
): string {
  const fileNameParts = ["task-sources", taskId];

  if (batchId != null) {
    fileNameParts.push(`batch-${batchId}`);
  }

  fileNameParts.push(`page-${page}`);
  return `${fileNameParts.join("-")}.xlsx`;
}
