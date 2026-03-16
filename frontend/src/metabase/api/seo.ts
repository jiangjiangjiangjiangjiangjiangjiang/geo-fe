import { Api } from "./api";

/** Request body for POST /api/ai/sentiment */
export interface SentimentJudgmentRequest {
  note_title: string;
  note_content: string;
}

/** Response from POST /api/ai/sentiment */
export interface SentimentJudgmentResponse {
  result: string;
}

export const seoApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    getSentimentJudgment: builder.mutation<
      SentimentJudgmentResponse,
      SentimentJudgmentRequest
    >({
      query: (body) => ({
        method: "POST",
        url: "/api/ai/sentiment",
        body,
      }),
    }),
  }),
});

export const { useGetSentimentJudgmentMutation } = seoApi;
