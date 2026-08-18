import type { GeoTaskExportItem } from "metabase/api/geo-task";

import {
  buildBulkResultExportFileName,
  buildBulkResultExportRows,
  formatSourcesForExport,
} from "./bulkResultExport";

describe("geo task bulk result export helpers", () => {
  const item: GeoTaskExportItem = {
    id: "result-1",
    geo_task_id: "task-1",
    task_name: "Task one",
    product_brand: "Brand",
    query: "Which product is best?",
    engine: "deepseek",
    ai_mode: "Search",
    batch_id: 123,
    collected_at: "2026-08-18T12:00:00Z",
    processed_content: "Answer",
    query_result: [{ rank: 1, item: "Brand" }],
    brand_mentioned: true,
    brand_rank: 1,
    is_first_recommendation: true,
    in_top3: true,
    visibility_score: 0.9,
    sentiment: 0.8,
    accuracy: 0.7,
    selling_point_mentions: { soft: true },
    product_keyword_mentions: { overnight: false },
    competitor_analyses: [{ name: "Competitor", rank: 2 }],
    sources: [
      { title: "Source one", url: "https://example.com/one" },
      { title: "Source two", url: "https://example.com/two" },
    ],
  };

  it("keeps every source in a single multiline cell", () => {
    expect(formatSourcesForExport(item.sources)).toBe(
      "1. Source one\nhttps://example.com/one\n\n2. Source two\nhttps://example.com/two",
    );
  });

  it("creates one spreadsheet row per result", () => {
    expect(buildBulkResultExportRows([item])).toEqual([
      expect.objectContaining({
        "Result ID": "result-1",
        "Task ID": "task-1",
        "Task Name": "Task one",
        "Selling Point Mentions": '{"soft":true}',
        "Product Keyword Mentions": '{"overnight":false}',
        "Competitor Analysis": '[{"name":"Competitor","rank":2}]',
        "Query Result": '[{"rank":1,"item":"Brand"}]',
        "Processed Content": "Answer",
        "Source Count": 2,
        Sources:
          "1. Source one\nhttps://example.com/one\n\n2. Source two\nhttps://example.com/two",
      }),
    ]);
  });

  it("neutralizes values that Excel could interpret as formulas", () => {
    const [row] = buildBulkResultExportRows([
      { ...item, processed_content: '=HYPERLINK("bad")' },
    ]);

    expect(row["Processed Content"]).toBe('\'=HYPERLINK("bad")');
  });

  it("includes the selected date range in the file name", () => {
    expect(buildBulkResultExportFileName("2026-08-01", "2026-08-18")).toBe(
      "geo-task-results-20260801-20260818.xlsx",
    );
  });

  it("uses an all-time filename when no date filter is applied", () => {
    expect(buildBulkResultExportFileName("", "")).toBe(
      "geo-task-results-all.xlsx",
    );
  });
});
