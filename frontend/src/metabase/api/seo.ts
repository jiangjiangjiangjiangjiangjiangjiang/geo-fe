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

export interface BrandSentimentRecognitionItem {
  brand_name?: string;
  sentiment?: string;
  evidence?: string;
}

/** Response from POST /api/ai/brand-sentiment */
export interface BrandSentimentRecognitionResponse {
  brands: BrandSentimentRecognitionItem[];
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
    getBrandSentimentRecognition: builder.mutation<
      BrandSentimentRecognitionResponse,
      SentimentJudgmentRequest
    >({
      query: (body) => ({
        method: "POST",
        url: "/api/ai/brand-sentiment",
        body,
      }),
    }),
  }),
});

export const {
  useGetSentimentJudgmentMutation,
  useGetBrandSentimentRecognitionMutation,
} = seoApi;
