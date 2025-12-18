import type { BaseQueryFn } from "@reduxjs/toolkit/query/react";

import { GEO_TASK_API_BASE_URL } from "metabase/config/geo-task";
import api from "metabase/lib/api";

type AllowedHTTPMethods = "GET" | "POST" | "PUT" | "DELETE";
const allowedHTTPMethods = new Set<AllowedHTTPMethods>([
  "GET",
  "POST",
  "PUT",
  "DELETE",
]);
const isAllowedHTTPMethod = (method: any): method is AllowedHTTPMethods => {
  return allowedHTTPMethods.has(method);
};

// custom fetcher that wraps our Api client
export const apiQuery: BaseQueryFn = async (args, ctx) => {
  const method = typeof args === "string" ? "GET" : (args?.method ?? "GET");
  let url = typeof args === "string" ? args : args.url;
  const { bodyParamName, noEvent, formData, fetch } = args;

  if (!isAllowedHTTPMethod(method)) {
    return { error: "Invalid HTTP method" };
  }

  // Special handling for /api/geo-task endpoints - use port 8000
  const isGeoTaskEndpoint =
    url === "/api/geo-task/list" ||
    url?.startsWith("/api/geo-task/list") ||
    url === "/api/geo-task/add" ||
    url?.startsWith("/api/geo-task/add") ||
    url === "/api/geo-task/execute" ||
    url?.startsWith("/api/geo-task/execute");

  if (isGeoTaskEndpoint) {
    // Handle /api/geo-task/list with query params
    if (url === "/api/geo-task/list" || url?.startsWith("/api/geo-task/list")) {
      // Build query string from params
      const queryParams = args?.params || {};
      const queryString = new URLSearchParams(
        Object.entries(queryParams)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      url = `${GEO_TASK_API_BASE_URL}/api/geo-task/list${queryString ? `?${queryString}` : ""}`;
    } else if (
      url === "/api/geo-task/add" ||
      url?.startsWith("/api/geo-task/add")
    ) {
      // Handle /api/geo-task/add
      url = `${GEO_TASK_API_BASE_URL}/api/geo-task/add`;
    } else if (
      url === "/api/geo-task/execute" ||
      url?.startsWith("/api/geo-task/execute")
    ) {
      // Handle /api/geo-task/execute
      url = `${GEO_TASK_API_BASE_URL}/api/geo-task/execute`;
    }

    // Use native fetch for full URL to avoid basename issues
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // Add session token if available
      if (api.sessionToken) {
        // eslint-disable-next-line no-literal-metabase-strings -- Not a user facing string
        headers["X-Metabase-Session"] = api.sessionToken;
      }

      const response = await globalThis.fetch(url, {
        method,
        headers,
        signal: ctx.signal,
        body:
          method !== "GET" && args?.body
            ? JSON.stringify(args.body)
            : undefined,
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => "");
        return {
          error: {
            status: response.status,
            data: errorData,
          },
        };
      }

      const data = await response.json();
      // Response format is already correct
      return { data };
    } catch (error) {
      return { error };
    }
  }

  try {
    const response = await api[method](url)(
      // this will transform arrays to objects with numeric keys
      // we shouldn't be using top level-arrays in the API
      { ...args?.body, ...args?.params },
      {
        signal: ctx.signal,
        bodyParamName,
        noEvent,
        formData,
        fetch,
      },
    );
    return { data: response };
  } catch (error) {
    return { error };
  }
};
