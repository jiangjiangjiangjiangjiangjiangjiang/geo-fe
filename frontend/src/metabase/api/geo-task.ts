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
  ai_mode?: string;
  comparison_brands?: string[] | Record<string, string[]>;
  product_keywords?: string;
  selling_point_keywords?: string[];
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
  ai_mode?: string;
  product_brand?: string;
  product_keywords?: string;
  selling_point_keywords?: string[];
  /** 竞品及关键词：{ 竞品名: [关键词1, 关键词2] } */
  comparison_brands?: Record<string, string[]>;
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

/** Single AI platform item from GET /api/ai-platforms (for task ai_model selection) */
export interface AiPlatformItem {
  key: string;
  name: string;
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
} = geoTaskApi;
