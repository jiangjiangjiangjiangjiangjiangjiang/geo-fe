import { t } from "ttag";

import { useGetSentimentJudgmentMutation } from "metabase/api/seo";
import { ExcelBatchAnalysisPage } from "metabase/seo/shared/ExcelBatchAnalysisPage";

type RowRecord = Record<string, unknown>;

function buildSentimentRequestFromRow(row: RowRecord) {
  const keys = Object.keys(row);
  if (keys.length === 0) {
    return {
      noteTitle: "",
      noteContent: "",
      request: { note_title: "", note_content: "" },
    };
  }

  const firstValue = row[keys[0]] != null ? String(row[keys[0]]).trim() : "";
  if (keys.length === 1) {
    return {
      noteTitle: "",
      noteContent: firstValue,
      request: { note_title: "", note_content: firstValue },
    };
  }

  const noteContent = keys
    .slice(1)
    .map((key) => (row[key] != null ? String(row[key]).trim() : ""))
    .filter(Boolean)
    .join(", ");

  return {
    noteTitle: firstValue,
    noteContent: noteContent || firstValue,
    request: {
      note_title: firstValue,
      note_content: noteContent || firstValue,
    },
  };
}

export function NoteSentimentJudgmentPage() {
  const [getSentimentJudgment] = useGetSentimentJudgmentMutation();

  return (
    <ExcelBatchAnalysisPage
      pageTitle={t`Note sentiment judgment result Agent`}
      pageDescription={t`Excel data result page`}
      pageHeading={t`Note sentiment judgment result Agent`}
      uploadPrompt={t`Click or drag to upload Excel file`}
      fetchButtonLabel={t`Fetch results for all rows`}
      resultColumnLabel={t`Result`}
      exportSheetName={t`Data results`}
      exportFileSuffix="sentiment-results"
      buildRequestFromRow={buildSentimentRequestFromRow}
      analyzeRow={(request) =>
        getSentimentJudgment({
          note_title: request.note_title || "",
          note_content: request.note_content || "(empty)",
        }).unwrap()
      }
      getResultText={(response) => response.result ?? ""}
    />
  );
}
