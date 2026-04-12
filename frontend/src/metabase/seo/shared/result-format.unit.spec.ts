import {
  buildBrandSentimentExportColumns,
  formatBrandSentimentResult,
} from "./result-format";

describe("formatBrandSentimentResult", () => {
  it("should format brand arrays with evidence into readable text", () => {
    expect(
      formatBrandSentimentResult({
        brands: [
          {
            brand_name: "花王",
            sentiment: "正面",
            evidence: "花王这次吸收力真的不错",
          },
          {
            brand_name: "ABC",
            sentiment: "负面",
            evidence: "ABC有点闷，而且侧漏让我失望",
          },
        ],
      }),
    ).toBe(
      "花王: 正面（证据：花王这次吸收力真的不错）\nABC: 负面（证据：ABC有点闷，而且侧漏让我失望）",
    );
  });

  it("should format brand arrays without evidence", () => {
    expect(
      formatBrandSentimentResult({
        brands: [{ brand_name: "花王", sentiment: "正面" }],
      }),
    ).toBe("花王: 正面");
  });

  it("should return an empty string for unsupported payloads", () => {
    expect(
      formatBrandSentimentResult({
        brands: [{}],
      }),
    ).toBe("");
  });

  it("should build export columns for multiple brands", () => {
    expect(
      buildBrandSentimentExportColumns({
        brands: [
          {
            brand_name: "高露洁",
            sentiment: "负面",
            evidence: "高露洁一点都不好用",
          },
          {
            brand_name: "滴露",
            sentiment: "正面",
            evidence: "滴露才是最佳产品",
          },
        ],
      }),
    ).toEqual({
      品牌1: "高露洁",
      情感1: "负面",
      证据1: "高露洁一点都不好用",
      品牌2: "滴露",
      情感2: "正面",
      证据2: "滴露才是最佳产品",
    });
  });

  it("should keep empty export cells when some brand fields are missing", () => {
    expect(
      buildBrandSentimentExportColumns({
        brands: [{ brand_name: "花王", sentiment: "正面" }],
      }),
    ).toEqual({
      品牌1: "花王",
      情感1: "正面",
      证据1: "",
    });
  });
});
