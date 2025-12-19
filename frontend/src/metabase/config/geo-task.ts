/**
 * Configuration for Geo Task API endpoints.
 *
 * This base URL is used for geo-task related API calls that need to be
 * routed to a separate backend service.
 *
 * To change the backend URL, update this constant. You can also use
 * environment variables by checking `process.env.GEO_TASK_API_URL` if needed.
 */
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "");

// Priority: localhost detection > explicit env var > default production URL
// If running on localhost, always use localhost:8000
// Otherwise, use env var if explicitly set, or fall back to production URL
export const GEO_TASK_API_BASE_URL = isLocalhost
  ? "http://localhost:8000"
  : process.env.GEO_TASK_API_URL || "http://47.97.180.126:8000";
