import type { SourceItem } from "metabase/api/geo-task";

import {
  buildSourceExportFileName,
  buildSourceExportMerges,
  buildSourceExportRows,
} from "./sourceExport";

describe("geo task source export helpers", () => {
  const sources: SourceItem[] = [
    {
      result_id: 42,
      title: "First title",
      url: "https://example.com/first",
    },
    {
      result_id: 43,
      title: null,
      url: null,
    },
    {
      result_id: 42,
      title: "Second title",
      url: "https://example.com/second",
    },
  ];

  it("keeps one row per title and URL while grouping rows by result ID", () => {
    expect(buildSourceExportRows(sources)).toEqual([
      {
        "Result ID": 42,
        Title: "First title",
        URL: "https://example.com/first",
      },
      {
        "Result ID": 42,
        Title: "Second title",
        URL: "https://example.com/second",
      },
      {
        "Result ID": 43,
        Title: "",
        URL: "",
      },
    ]);
  });

  it("merges only the Result ID cells for groups with multiple sources", () => {
    expect(buildSourceExportMerges(sources)).toEqual([
      {
        s: { r: 1, c: 0 },
        e: { r: 2, c: 0 },
      },
    ]);
  });

  it("includes the task, batch and page in the exported file name", () => {
    expect(buildSourceExportFileName("task-1", 7, 3)).toBe(
      "task-sources-task-1-batch-7-page-3.xlsx",
    );
  });

  it("omits the batch segment when all batches are selected", () => {
    expect(buildSourceExportFileName("task-1", undefined, 1)).toBe(
      "task-sources-task-1-page-1.xlsx",
    );
  });
});
