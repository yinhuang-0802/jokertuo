import { describe, expect, it } from "vitest";
import { detectCombo } from "@/game/combos";
import type { Card } from "@/game/types";

function c(id: string): Card {
  const rank = id.slice(0, -1) as Card["rank"];
  const suit = id.slice(-1) as Card["suit"];
  return { id, rank, suit };
}

describe("detectCombo", () => {
  it("识别单张", () => {
    const combo = detectCombo([c("4D")]);
    expect(combo?.type).toBe("single");
  });

  it("识别对子", () => {
    const combo = detectCombo([c("7D"), c("7S")]);
    expect(combo?.type).toBe("pair");
  });

  it("识别顺子（支持A-2-3-4-5绕回）", () => {
    const combo = detectCombo([c("AD"), c("2C"), c("3H"), c("4S"), c("5D")]);
    expect(combo?.type).toBe("straight");
  });

  it("识别同花顺", () => {
    const combo = detectCombo([c("4S"), c("5S"), c("6S"), c("7S"), c("8S")]);
    expect(combo?.type).toBe("straight_flush");
  });
});

