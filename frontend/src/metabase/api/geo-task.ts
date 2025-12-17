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
  id: string;
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
    executeGeoTask: builder.mutation<void, ExecuteGeoTaskRequest>({
      query: ({ id }: ExecuteGeoTaskRequest) => ({
        method: "POST",
        url: `/api/geo-task/${id}/execute`,
      }),
    }),
  }),
});

export const {
  useListGeoTasksQuery,
  useCreateGeoTaskMutation,
  useExecuteGeoTaskMutation,
} = geoTaskApi;
