import { Api } from "./api";
import { listTag, provideGeoTaskListTags } from "./tags";

export interface GeoTask {
  id: string;
  platform_id?: string;
  platform_name?: string;
  usr_company_id?: string;
  product_brand?: string;
  task_name?: string;
  query_text?: string;
  ai_model?: string;
  ai_platforms?: string[];
  ai_mode?: string;
  comparison_brands?: string[] | Record<string, string[]>;
  product_keywords?: string;
  selling_point_keywords?: string[];
  search_times_per_day?: number;
  enabled?: boolean;
  schedule_cron?: string;
  last_run_at?: string;
  created_at?: string;
  updated_at?: string;
}

/** Create request for POST api/geo-task/add */
export interface CreateGeoTaskRequest {
  task_name: string;
  query_text?: string;
  ai_model?: string;
  ai_platforms?: string[];
  ai_mode?: string;
  product_brand?: string;
  product_keywords?: string;
  selling_point_keywords?: string[];
  /** 竞品及关键词：{ 竞品名: [关键词1, 关键词2] } */
  comparison_brands?: Record<string, string[]>;
  search_times_per_day?: number;
  enabled?: boolean;
  schedule_cron?: string;
}

export interface ListGeoTasksRequest {
  page: number;
  page_size: number;
  enabled?: boolean;
  platform_id?: string;
  usr_company_id?: string;
}

export interface ListGeoTasksResponse {
  items: GeoTask[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Request body for toggle (enable/disable) – aligns with Python ToggleRequest */
export interface ToggleRequest {
  enabled: boolean;
}

/** Response from POST .../toggle – aligns with Python ToggleResponse */
export interface ToggleResponse {
  success: boolean;
  message: string;
  enabled: boolean;
}

export interface UpdateGeoTaskRequest {
  taskId: string;
  enabled: boolean;
}

export interface ExecuteGeoTaskRequest {
  geo_task_id: string;
}

export interface ExecuteGeoTaskResponse {
  success: boolean;
  inserted: number;
  task_count: number;
  task_ids: string[];
  message: string;
}

/** Task schedule config (crontab) response from API */
export interface ScheduleConfigResponse {
  task_id: string;
  schedule_cron: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
}

/** Request body for setting task schedule */
export interface ScheduleConfigRequest {
  schedule_cron: string;
}

export interface Category {
  name: string;
  description: string;
  competitors: string[];
}

export interface GeoCompetitorAnalysis {
  name?: string;
  rank?: number | null;
  in_top3?: boolean | null;
  mentioned?: boolean;
  brand_mentions?: {
    hits?: unknown[];
    mentioned?: boolean;
  };
  keyword_mentions?: Record<string, boolean>;
  selling_point_mentions?: Record<string, boolean>;
  is_first_recommendation?: boolean | null;
  product_keyword_mentions?: Record<string, boolean>;
}

export interface GeoResultMetadata {
  source?: string;
  category?: string | null;
  len_html?: number;
  len_text?: number;
  collector_ts?: string;
  recommendations?: unknown[];
  analysis_version?: string;
  all_brand_analysis?: unknown[];
  competitor_analyses?: GeoCompetitorAnalysis[];
}

export interface GetCategoriesResponse {
  success: boolean;
  categories: Category[];
  total: number;
}

/** Single result item from GET api/geo-task/{task_id}/results */
export interface GeoResultResponse {
  id: number;
  batch_id: number;
  query: string;
  engine: string;
  platform_id: number | null;
  platform_name: string | null;
  geo_task_id: string;
  usr_company_id: number | null;
  usr_company_name: string | null;
  mention_rate: number | null;
  visibility_score: number;
  sentiment: number;
  accuracy: number;
  raw_content: string | null;
  processed_content: string | null;
  query_result: unknown;
  brand_mentioned: boolean;
  brand_hits: unknown;
  brand_rank: number | null;
  is_first_recommendation: boolean | null;
  in_top3: boolean | null;
  selling_point_mentions: unknown;
  product_keyword_mentions: unknown;
  sources: unknown;
  metadata: GeoResultMetadata | null;
  collected_at: string | null;
  processed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GeoTaskResultsRequest {
  taskId: string;
  page?: number;
  page_size?: number;
  batch_id?: number;
}

export interface GeoResultListResponse {
  items: GeoResultResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Single source item from GET api/geo-task/{task_id}/sources */
export interface SourceItem {
  title: string | null;
  url: string | null;
  result_id: number;
}

export interface GeoTaskSourcesRequest {
  taskId: string;
  page?: number;
  page_size?: number;
  batch_id?: number;
}

export interface SourceListResponse {
  items: SourceItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GeoTaskSummaryTerm {
  term_index: number;
  term_label: string;
  keyword: string;
  mention_count: number;
  mention_rate: number;
}

export interface GeoTaskSummaryBrandSummary {
  brand_name: string;
  brand_role: "product_brand" | "competitor";
  brand_term_1: string | null;
  product_terms: string[];
  mention_count: number;
  mention_rate: number;
  first_recommendation_count: number;
  first_recommendation_rate: number;
  top3_count: number;
  top3_rate: number;
  positive_count: number;
  positive_rate: number;
  neutral_count: number;
  neutral_rate: number;
  negative_count: number;
  negative_rate: number;
  average_rank: number | null;
  best_rank: number | null;
  brand_terms: GeoTaskSummaryTerm[];
  product_keyword_terms: GeoTaskSummaryTerm[];
  selling_point_terms: GeoTaskSummaryTerm[];
}

export interface GeoTaskSummaryForm {
  task: {
    task_id: string;
    task_name: string;
    query_text: string;
    ai_mode: string;
    ai_model: string;
    ai_platforms: string[];
    product_brand: string | null;
    comparison_brands: string[];
    product_keywords: string[];
    selling_point_keywords: string[];
  };
  batch: {
    result_count: number;
    platform_count: number;
    platforms: string[];
    started_at: string | null;
    ended_at: string | null;
  };
  summary: {
    basic_info: {
      task_id: string;
      task_name: string;
      query_text: string;
      ai_mode: string;
      ai_model: string;
      ai_platforms: string[];
      result_count: number;
      platform_count: number;
    };
    product_summary: GeoTaskSummaryBrandSummary | null;
    comparison_summaries: GeoTaskSummaryBrandSummary[];
  };
}

export interface GeoTaskDashboardRequest {
  taskId: string;
  start_date: string;
  end_date: string;
}

interface GeoTaskDashboardApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface GeoTaskDashboardSummary {
  task: {
    task_id: string;
    task_name: string;
    query_text: string;
    product_brand: string | null;
    comparison_brands: string[];
    ai_model: string | null;
    enabled: boolean;
    last_run_at: string | null;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
  metrics: {
    brand_mention_count: number;
    brand_mention_count_change: number | null;
    brand_mention_rate?: number | null;
    total_result_count?: number | null;
    covered_platform_count: number;
    total_platform_count: number;
    average_rank: number | null;
    best_rank: number | null;
    best_rank_platforms: string[];
    first_recommendation_count?: number | null;
    first_recommendation_rate?: number | null;
    first_recommendation_platform_count: number;
    first_recommendation_platforms: string[];
    top3_recommendation_count?: number | null;
    top3_recommendation_rate?: number | null;
    top3_platform_count: number;
    top3_platforms: string[];
    negative_mention_count?: number | null;
    negative_exposure_rate?: number | null;
    selling_point_mention_count?: number | null;
    selling_point_exposure_rate?: number | null;
  };
}

export interface GeoTaskDashboardBrand {
  brand_name: string;
  brand_role: "product_brand" | "competitor";
}

export interface GeoTaskDashboardPlatform {
  platform_key: string;
  platform_name: string;
}

export interface GeoTaskDashboardMatrixCell {
  platform_key: string;
  platform_name: string;
  brand_name: string;
  brand_role: "product_brand" | "competitor";
  mentioned: boolean;
  rank: number | null;
  display_text: string;
  status: "mentioned_with_rank" | "mentioned_without_rank" | "not_mentioned";
  is_first_recommendation: boolean;
  in_top3: boolean;
}

export interface GeoTaskDashboardMatrixLegendItem {
  status: "mentioned_with_rank" | "mentioned_without_rank" | "not_mentioned";
  label: string;
}

export interface GeoTaskDashboardMatrix {
  brands: GeoTaskDashboardBrand[];
  platforms: GeoTaskDashboardPlatform[];
  cells: GeoTaskDashboardMatrixCell[];
  legend: GeoTaskDashboardMatrixLegendItem[];
}

export interface GeoTaskDashboardTopSourceItem {
  source_name: string;
  source_domain: string;
  reference_count: number;
  percentage: number;
  sample_urls: string[];
}

export interface GeoTaskDashboardTopSources {
  items: GeoTaskDashboardTopSourceItem[];
  total_reference_count: number;
}

export interface GeoTaskDashboardMentionTrendSeriesPoint {
  date: string;
  mention_count: number;
  mention_rate?: number | null;
}

export interface GeoTaskDashboardMentionTrendSeries {
  brand_name: string;
  brand_role: "product_brand" | "competitor";
  points: GeoTaskDashboardMentionTrendSeriesPoint[];
}

export interface GeoTaskDashboardMentionTrend {
  granularity: "day";
  x_axis: string[];
  series: GeoTaskDashboardMentionTrendSeries[];
}

export interface GeoTaskDashboardSentimentOverall {
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  positive_ratio: number;
  neutral_ratio: number;
  negative_ratio: number;
}

export interface GeoTaskDashboardSentimentByPlatform {
  platform_key: string;
  platform_name: string;
  sentiment_label: "positive" | "neutral" | "negative";
  sentiment_score: number;
}

export interface GeoTaskDashboardSentimentDistribution {
  overall: GeoTaskDashboardSentimentOverall;
  by_platform: GeoTaskDashboardSentimentByPlatform[];
}

export interface GeoTaskDashboardTopSourcesRequest
  extends GeoTaskDashboardRequest {
  limit?: number;
}

/** Single AI platform item from GET /api/ai-platforms (for task ai_model selection) */
export interface AiPlatformItem {
  key: string;
  name: string;
}

function unwrapGeoTaskDashboardResponse<T>(
  response: GeoTaskDashboardApiResponse<T>,
): T {
  if (response.data == null) {
    throw new Error(response.message || "Geo dashboard data is empty");
  }

  return response.data;
}

export const geoTaskApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    listGeoTasks: builder.query<ListGeoTasksResponse, ListGeoTasksRequest>({
      query: (params) => ({
        method: "GET",
        url: "/api/geo-task/list",
        params,
      }),
      providesTags: (response) =>
        response?.items
          ? provideGeoTaskListTags(response.items)
          : [listTag("geo-task")],
    }),
    createGeoTask: builder.mutation<GeoTask, CreateGeoTaskRequest>({
      query: (body: CreateGeoTaskRequest) => ({
        method: "POST",
        url: "/api/geo-task/add",
        body,
      }),
      invalidatesTags: (_result, error) => (error ? [] : [listTag("geo-task")]),
    }),
    /** POST /queries/{task_id}/toggle – enable/disable task (Python backend) */
    updateGeoTask: builder.mutation<ToggleResponse, UpdateGeoTaskRequest>({
      query: ({ taskId, enabled }) => ({
        method: "POST",
        url: `/api/geo-task/${taskId}/toggle`,
        body: { enabled } as ToggleRequest,
      }),
      invalidatesTags: (_result, error) => (error ? [] : [listTag("geo-task")]),
    }),
    executeGeoTask: builder.mutation<
      ExecuteGeoTaskResponse,
      ExecuteGeoTaskRequest
    >({
      query: (body: ExecuteGeoTaskRequest) => ({
        method: "POST",
        url: "/api/geo-task/execute-v2",
        body,
      }),
    }),
    getCategories: builder.query<GetCategoriesResponse, void>({
      query: () => ({
        method: "GET",
        url: "/api/categories",
      }),
    }),
    getAiPlatforms: builder.query<AiPlatformItem[], void>({
      query: () => ({
        method: "GET",
        url: "/api/ai-platforms",
      }),
    }),
    getTaskSchedule: builder.query<ScheduleConfigResponse, string>({
      query: (taskId) => ({
        method: "GET",
        url: `/api/geo-task/${taskId}/schedule`,
      }),
      providesTags: (_result, _error, taskId) => [
        { type: "geo-task-schedule", id: taskId },
      ],
    }),
    setTaskSchedule: builder.mutation<
      ScheduleConfigResponse,
      { taskId: string; body: ScheduleConfigRequest }
    >({
      query: ({ taskId, body }) => ({
        method: "PUT",
        url: `/api/geo-task/${taskId}/schedule`,
        body,
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "geo-task-schedule", id: taskId },
      ],
    }),
    getGeoTaskResults: builder.query<
      GeoResultListResponse,
      GeoTaskResultsRequest
    >({
      query: ({ taskId, page = 1, page_size = 20, batch_id }) => ({
        method: "GET",
        url: `/api/geo-task/${taskId}/results`,
        params: { page, page_size, ...(batch_id != null && { batch_id }) },
      }),
    }),
    getGeoTaskSources: builder.query<SourceListResponse, GeoTaskSourcesRequest>(
      {
        query: ({ taskId, page = 1, page_size = 20, batch_id }) => ({
          method: "GET",
          url: `/api/geo-task/${taskId}/sources`,
          params: { page, page_size, ...(batch_id != null && { batch_id }) },
        }),
      },
    ),
    getGeoTaskSummaryForm: builder.query<GeoTaskSummaryForm, string>({
      query: (taskId) => ({
        method: "GET",
        url: `/api/geo-task/${taskId}/summary-form`,
      }),
      transformResponse: unwrapGeoTaskDashboardResponse,
    }),
    getGeoTaskDashboardSummary: builder.query<
      GeoTaskDashboardSummary,
      GeoTaskDashboardRequest
    >({
      query: ({ taskId, start_date, end_date }) => ({
        method: "GET",
        url: `/api/geo-task/${taskId}/dashboard/summary`,
        params: { start_date, end_date },
      }),
      transformResponse: unwrapGeoTaskDashboardResponse,
    }),
    getGeoTaskDashboardMatrix: builder.query<
      GeoTaskDashboardMatrix,
      GeoTaskDashboardRequest
    >({
      query: ({ taskId, start_date, end_date }) => ({
        method: "GET",
        url: `/api/geo-task/${taskId}/dashboard/matrix`,
        params: { start_date, end_date },
      }),
      transformResponse: unwrapGeoTaskDashboardResponse,
    }),
    getGeoTaskDashboardTopSources: builder.query<
      GeoTaskDashboardTopSources,
      GeoTaskDashboardTopSourcesRequest
    >({
      query: ({ taskId, start_date, end_date, limit = 10 }) => ({
        method: "GET",
        url: `/api/geo-task/${taskId}/dashboard/top-sources`,
        params: { start_date, end_date, limit },
      }),
      transformResponse: unwrapGeoTaskDashboardResponse,
    }),
    getGeoTaskDashboardMentionTrend: builder.query<
      GeoTaskDashboardMentionTrend,
      GeoTaskDashboardRequest
    >({
      query: ({ taskId, start_date, end_date }) => ({
        method: "GET",
        url: `/api/geo-task/${taskId}/dashboard/mention-trend`,
        params: { start_date, end_date, granularity: "day" },
      }),
      transformResponse: unwrapGeoTaskDashboardResponse,
    }),
    getGeoTaskDashboardSentimentDistribution: builder.query<
      GeoTaskDashboardSentimentDistribution,
      GeoTaskDashboardRequest
    >({
      query: ({ taskId, start_date, end_date }) => ({
        method: "GET",
        url: `/api/geo-task/${taskId}/dashboard/sentiment-distribution`,
        params: { start_date, end_date },
      }),
      transformResponse: unwrapGeoTaskDashboardResponse,
    }),
  }),
});

export const {
  useListGeoTasksQuery,
  useCreateGeoTaskMutation,
  useUpdateGeoTaskMutation,
  useExecuteGeoTaskMutation,
  useGetCategoriesQuery,
  useGetAiPlatformsQuery,
  useGetTaskScheduleQuery,
  useSetTaskScheduleMutation,
  useGetGeoTaskResultsQuery,
  useGetGeoTaskSourcesQuery,
  useGetGeoTaskSummaryFormQuery,
  useGetGeoTaskDashboardSummaryQuery,
  useGetGeoTaskDashboardMatrixQuery,
  useGetGeoTaskDashboardTopSourcesQuery,
  useGetGeoTaskDashboardMentionTrendQuery,
  useGetGeoTaskDashboardSentimentDistributionQuery,
} = geoTaskApi;
