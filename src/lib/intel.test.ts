import { describe, expect, it } from "vitest";
import {
  classifyCategory,
  classifyFocus,
  classifyType,
  computeSignalScore,
  isTargetedScan,
  searchTermsForFilters,
  signalFromScore,
} from "./intel";

describe("intel classification", () => {
  it("classifies Codex and coding-agent stories", () => {
    const text = "Codex CLI workflow update spotted for AI coding agents";

    expect(classifyFocus(text)).toBe("Codex");
    expect(classifyType(text)).toBe("Coding Agents");
    expect(classifyCategory(text)).toBe("Workflows");
  });

  it("classifies Claude API changes", () => {
    const text = "Claude Code skill API breaking change in Anthropic release notes";

    expect(classifyFocus(text)).toBe("Claude");
    expect(classifyType(text)).toBe("API Changes");
    expect(classifyCategory(text)).toBe("Skills");
  });

  it("classifies projects, useful tools, tricks, guides, and prompts", () => {
    expect(classifyCategory("open source Codex project template")).toBe("Projects");
    expect(classifyCategory("MCP tool for Claude Code")).toBe("Useful Tools");
    expect(classifyCategory("useful ChatGPT trick for faster answers")).toBe("Useful Tricks");
    expect(classifyCategory("complete guide to running local AI agents")).toBe("Guides");
    expect(classifyCategory("system prompt pattern for coding agents")).toBe("Prompts");
  });
});

describe("targeted scans", () => {
  it("builds focused useful-tool searches for selected focus and category", () => {
    const terms = searchTermsForFilters({
      focus: "Codex",
      type: "All",
      category: "Useful Tools",
      source: "All",
    });

    expect(isTargetedScan({ focus: "Codex", type: "All", category: "Useful Tools", source: "All" })).toBe(true);
    expect(terms).toEqual(expect.arrayContaining(["codex tools", "codex cli", "codex mcp server"]));
  });

  it("keeps broad scans available when no filters are selected", () => {
    const filters = { focus: "All", type: "All", category: "All", source: "All" } as const;

    expect(isTargetedScan(filters)).toBe(false);
    expect(searchTermsForFilters(filters).length).toBeGreaterThan(10);
  });
});

describe("intel scoring", () => {
  it("promotes fresh high-engagement developer-impact stories", () => {
    const score = computeSignalScore({
      source: "GitHub",
      ageMinutes: 12,
      score: 120,
      comments: 35,
      title: "Codex agent benchmark release",
    });

    expect(score).toBeGreaterThanOrEqual(82);
    expect(signalFromScore(score)).toBe("CRITICAL");
  });

  it("keeps low-engagement older stories in watch state", () => {
    const score = computeSignalScore({
      source: "Reddit",
      ageMinutes: 22 * 60,
      score: 1,
      comments: 0,
      title: "small discussion",
    });

    expect(score).toBeLessThan(62);
    expect(signalFromScore(score)).toBe("WATCH");
  });
});
