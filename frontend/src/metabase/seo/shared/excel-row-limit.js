import { msgid } from "ttag";

export const MAX_EXCEL_ROWS = 1000;

export const EXCEL_ROW_LIMIT_WARNING_MSGID = msgid`Excel exceeds the maximum of ${MAX_EXCEL_ROWS} rows; only the first ${MAX_EXCEL_ROWS} rows will be processed.`;

export const EXCEL_ROW_LIMIT_WARNING_ZH = `Excel 超过 ${MAX_EXCEL_ROWS} 行上限，仅处理前 ${MAX_EXCEL_ROWS} 行。`;
