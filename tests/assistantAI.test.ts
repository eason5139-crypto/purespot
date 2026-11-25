import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generate };
  },
}));
import { explainAssistantResult } from "@/server/assistantAI";
import {
  ASSISTANT_FALLBACK_MODEL,
  defaultAssistantSettings,
  type AssistantResult,
} from "@/lib/assistant";
const result: AssistantResult = {
  category: "features",
  products: [],
  documents: [
    {
      id: "family",
      title: "家庭共買",
      text: "家人共用清單，主帳戶確認。",
      href: "/account?tab=family",
      category: "features",
      keywords: "家庭",
    },
  ],
  answer: "到家庭共買查看清單。",
  followUps: [],
  compareHref: null,
  accountRequired: false,
  sourceStatus: "current",
  canAddToCart: false,
};
const response = (
  answer = "家人可以共用清單，由主帳戶確認。",
  ids = ["family"],
) => ({ text: JSON.stringify({ answer, evidenceIds: ids }) });
let index = 0;
beforeEach(() => {
  generate.mockReset();
  vi.stubEnv("GEMINI_API_KEY", "unit-test-key");
  vi.stubEnv("GEMINI_MODEL", `unit-model-${++index}`);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("小P AI 服務的證據與備援", () => {
  it("會員的私人回答不送到模型", async () => {
    const own = {
      ...result,
      documents: [{ ...result.documents[0]!, private: true }],
    };
    expect(
      (await explainAssistantResult("我的家庭", own, defaultAssistantSettings))
        .state,
    ).toBe("local");
    expect(generate).not.toHaveBeenCalled();
  });
  it("主模型額度不足時改用已核實的備援，並保留同一份證據", async () => {
    generate
      .mockRejectedValueOnce({
        status: 429,
        message: JSON.stringify({
          error: { details: [{ retryDelay: "60s" }] },
        }),
      })
      .mockResolvedValueOnce(response());
    expect(
      (
        await explainAssistantResult(
          "家庭共買在哪？",
          result,
          defaultAssistantSettings,
        )
      ).state,
    ).toBe("used");
    expect(generate.mock.calls[1]![0].model).toBe(ASSISTANT_FALLBACK_MODEL);
    expect(generate.mock.calls[1]![0].contents).toBe(
      generate.mock.calls[0]![0].contents,
    );
    expect(generate.mock.calls[1]![0].config.thinkingConfig).toBeUndefined();
    generate.mockResolvedValueOnce(response());
    await explainAssistantResult(
      "家庭共買在哪？",
      result,
      defaultAssistantSettings,
    );
    expect(generate.mock.calls[2]![0].model).toBe(ASSISTANT_FALLBACK_MODEL);
  });
  it("沒有來源的優惠數字與捏造入口不取代站內說明", async () => {
    generate.mockResolvedValueOnce(response("可以領9999元優惠"));
    expect(
      (
        await explainAssistantResult(
          "家庭共買",
          result,
          defaultAssistantSettings,
        )
      ).answer,
    ).toBe(result.answer);
    generate.mockResolvedValueOnce(
      response("到未公布入口", "unknown".split(",")),
    );
    expect(
      (
        await explainAssistantResult(
          "家庭共買",
          result,
          defaultAssistantSettings,
        )
      ).answer,
    ).toBe(result.answer);
  });
  it("兩個模型都暫時不可用時仍保留原來的結果", async () => {
    generate.mockRejectedValue({ status: 503, name: "ApiError" });
    const answer = await explainAssistantResult(
      "家庭共買",
      result,
      defaultAssistantSettings,
    );
    expect(answer.answer).toBe(result.answer);
    expect(answer.state).toBe("unavailable");
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
