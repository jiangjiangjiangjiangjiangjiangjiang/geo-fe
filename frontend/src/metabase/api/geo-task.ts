import { Api } from "./api";
import { listTag, provideGeoTaskListTags } from "./tags";

export interface GeoTask {
  id: string;
  platform_id?: string;
  platform_name?: string;
  usr_company_id?: string;
  usr_company_name?: string;
  query_text: string;
  brand_keywords?: string;
  enabled?: boolean;
  schedule_cron?: string;
  category?: string;
  last_run_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateGeoTaskRequest {
  query_text: string;
  platform_name?: string;
  usr_company_name?: string;
  brand_keywords?: string;
  schedule_cron?: string;
  enabled?: boolean;
  category?: string;
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
  }),
});

export const {
  useListGeoTasksQuery,
  useCreateGeoTaskMutation,
  useExecuteGeoTaskMutation,
  useGetCategoriesQuery,
} = geoTaskApi;
