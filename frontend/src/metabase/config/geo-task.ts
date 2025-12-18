/**
 * Configuration for Geo Task API endpoints.
 *
 * This base URL is used for geo-task related API calls that need to be
 * routed to a separate backend service.
 *
 * To change the backend URL, update this constant. You can also use
 * environment variables by checking `process.env.GEO_TASK_API_URL` if needed.
 */
export const GEO_TASK_API_BASE_URL =
  process.env.GEO_TASK_API_URL ||
  "https://geo-api.streamcross-dashboard.com:8000";
