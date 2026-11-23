import { describe, it, expect } from "vitest";
import {
  DEFAULT_SURVEYS,
  answerError,
  isSurveyOpen,
  surveySchema,
  validatedAnswers,
} from "@/lib/surveys";
const s = DEFAULT_SURVEYS[0]!;
describe("surveys", () => {
  it("validates both original questionnaires", () =>
    DEFAULT_SURVEYS.forEach((s) =>
      expect(surveySchema.safeParse(s).success).toBe(true),
    ));
  it("rejects skipped required fields", () =>
    expect(() => validatedAnswers(s, {})).toThrow("你和哪些毛孩"));
  it("follows branching and strips stale hidden answers", () => {
    const a = validatedAnswers(s, {
      species: ["o1"],
      priority: "o1",
      shopping: "o2",
      autoship: "o2",
      frequency: "forged",
    });
    expect(a).not.toHaveProperty("frequency");
  });
  it("requires the final question for the other branch", () =>
    expect(() =>
      validatedAnswers(s, {
        species: ["o1"],
        priority: "o1",
        shopping: "o2",
        autoship: "o1",
      }),
    ).toThrow("哪種配送"));
  it("rejects invalid and repeated multiple choices", () => {
    expect(answerError(s.questions[0]!, ["o1", "o1"])).toBeTruthy();
    expect(answerError(s.questions[0]!, ["fake"])).toBeTruthy();
  });
  it("rejects backward branches and unsafe images", () => {
    const x = structuredClone(s);
    x.questions[2]!.logic = [{ value: "o1", target: "species" }];
    expect(surveySchema.safeParse(x).success).toBe(false);
    expect(
      surveySchema.safeParse({ ...s, image: "http://localhost/internal" })
        .success,
    ).toBe(false);
  });
  it("enforces publishing schedule", () =>
    expect(
      isSurveyOpen(
        { ...s, startsAt: "2027-01-01T00:00:00Z" },
        new Date("2026-11-23"),
      ),
    ).toBe(false));
  it("treats whitespace-only required text as missing", () =>
    expect(
      answerError(
        { ...DEFAULT_SURVEYS[1]!.questions[3]!, required: true },
        "   ",
      ),
    ).toBeTruthy());
});
