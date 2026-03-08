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

export interface GetCategoriesResponse {
  success: boolean;
  categories: Category[];
  total: number;
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
        url: "/api/geo-task/execute",
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
} = geoTaskApi;
