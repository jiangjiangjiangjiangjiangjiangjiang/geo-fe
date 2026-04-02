import { t } from "ttag";

import { useGetBrandSentimentRecognitionMutation } from "metabase/api/seo";
import { ExcelBatchAnalysisPage } from "metabase/seo/shared/ExcelBatchAnalysisPage";
import { formatBrandSentimentResult } from "metabase/seo/shared/result-format";

type RowRecord = Record<string, unknown>;

const TITLE_KEYS = ["笔记标题", "note_title", "标题"];
const CONTENT_KEYS = ["笔记内容", "note_content", "内容"];

function getCellValueByKeys(row: RowRecord, candidateKeys: string[]): string {
  for (const key of candidateKeys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function validateBrandSentimentRows(rows: RowRecord[]): string | null {
  if (rows.length === 0) {
    return null;
  }

  if (rows.length > 100) {
    return t`最多只支持 100 行笔记，请调整 Excel 后重试。`;
  }

  const firstRow = rows[0];
  const hasTitleColumn = TITLE_KEYS.some((key) => key in firstRow);
  const hasContentColumn = CONTENT_KEYS.some((key) => key in firstRow);

  if (!hasTitleColumn || !hasContentColumn) {
    return t`Excel 文件必须包含“笔记标题”和“笔记内容”两列。`;
  }

  return null;
}

function buildBrandSentimentRequestFromRow(row: RowRecord) {
  const noteTitle = getCellValueByKeys(row, TITLE_KEYS);
  const noteContent = getCellValueByKeys(row, CONTENT_KEYS);

  return {
    noteTitle,
    noteContent,
    request: {
      note_title: noteTitle,
      note_content: noteContent,
    },
  };
}

export function NoteBrandSentimentRecognitionPage() {
  const [getBrandSentimentRecognition] =
    useGetBrandSentimentRecognitionMutation();

  return (
    <ExcelBatchAnalysisPage
      pageTitle={t`笔记品牌情感识别`}
      pageDescription={t`上传 Excel 笔记并识别品牌及情感`}
      pageHeading={t`笔记品牌情感识别`}
      uploadPrompt={t`Click or drag to upload Excel file`}
      fetchButtonLabel={t`识别全部行品牌情感`}
      resultColumnLabel={t`品牌情感结果`}
      exportSheetName={t`品牌情感识别结果`}
      exportFileSuffix="brand-sentiment-results"
      buildRequestFromRow={buildBrandSentimentRequestFromRow}
      validateParsedRows={validateBrandSentimentRows}
      analyzeRow={(request) => getBrandSentimentRecognition(request).unwrap()}
      getResultText={(response) =>
        formatBrandSentimentResult(response) || t`未识别到品牌`
      }
    />
  );
}
