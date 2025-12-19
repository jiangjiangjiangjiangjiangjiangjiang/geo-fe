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
        Accept: "application/json",
      };

      // Only add Content-Type for non-GET requests to avoid unnecessary preflight
      // GET requests should not have Content-Type header to avoid CORS preflight
      if (method !== "GET") {
        headers["Content-Type"] = "application/json";
      }

      // Add session token if available
      if (api.sessionToken) {
        // eslint-disable-next-line no-literal-metabase-strings -- Not a user facing string
        headers["X-Metabase-Session"] = api.sessionToken;
      }

      const fetchOptions = {
        method,
        headers,
        signal: ctx.signal,
        mode: "cors" as RequestMode, // Explicitly enable CORS for cross-origin requests
        credentials: "omit" as RequestCredentials, // Don't send cookies for cross-origin requests
        body:
          method !== "GET" && args?.body
            ? JSON.stringify(args.body)
            : undefined,
      };

      let response: Response;
      try {
        response = await globalThis.fetch(url, fetchOptions);
      } catch (fetchError) {
        // Catch network errors (including CORS errors)
        console.error("[Geo Task API] Fetch network error:", {
          url,
          method,
          error:
            fetchError instanceof Error
              ? {
                  name: fetchError.name,
                  message: fetchError.message,
                  stack: fetchError.stack,
                }
              : fetchError,
        });
        throw fetchError;
      }

      // Extract response headers for error handling
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => "");
        console.error("[Geo Task API] Error response:", {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          headers: responseHeaders,
          corsHeaders: {
            "access-control-allow-origin":
              responseHeaders["access-control-allow-origin"],
            "access-control-allow-methods":
              responseHeaders["access-control-allow-methods"],
            "access-control-allow-headers":
              responseHeaders["access-control-allow-headers"],
          },
          requestHeaders: headers,
          hasSessionToken: !!api.sessionToken,
        });

        // If 403 and no CORS headers, it's likely a CORS issue
        if (
          response.status === 403 &&
          !responseHeaders["access-control-allow-origin"]
        ) {
          console.error(
            "[Geo Task API] 403 Forbidden - Possible CORS issue: Missing Access-Control-Allow-Origin header",
          );
        }

        return {
          error: {
            status: response.status,
            data: errorData,
            message:
              response.status === 403
                ? "Forbidden: Check if backend has CORS configured and authentication is correct"
                : `Request failed with status ${response.status}`,
          },
        };
      }

      const data = await response.json();
      // Response format is already correct
      return { data };
    } catch (error) {
      console.error("[Geo Task API] Fetch error:", {
        url,
        method,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      });
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
