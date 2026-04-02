import { formatBrandSentimentResult } from "./result-format";

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
});
