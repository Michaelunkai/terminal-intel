import { describe, expect, it } from "vitest";
import {
  classifyCategory,
  classifyFocus,
  classifyType,
  computeSignalScore,
  isTargetedScan,
  normalizeWindowDays,
  resourceCategoryOptions,
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
      windowDays: 1,
    });

    expect(isTargetedScan({ focus: "Codex", type: "All", category: "Useful Tools", source: "All", windowDays: 1 })).toBe(true);
    expect(terms).toEqual(expect.arrayContaining(["codex tools", "codex cli", "codex mcp server"]));
  });

  it("builds OpenClaw searches that include ClawHub, Clawdhub, and MoltBot", () => {
    const terms = searchTermsForFilters({
      focus: "OpenClaw",
      type: "All",
      category: "Automations",
      source: "All",
      windowDays: 7,
    });

    expect(terms).toEqual(expect.arrayContaining(["openclaw automation", "clawhub automation", "clawdhub automation", "moltbot automation"]));
  });

  it("normalizes scan windows from 24 hours through 30 days", () => {
    expect(normalizeWindowDays("1")).toBe(1);
    expect(normalizeWindowDays("24h")).toBe(1);
    expect(normalizeWindowDays("48h")).toBe(2);
    expect(normalizeWindowDays("3")).toBe(3);
    expect(normalizeWindowDays("30")).toBe(30);
    expect(normalizeWindowDays("999")).toBe(30);
    expect(normalizeWindowDays("0")).toBe(1);
  });

  it("keeps broad scans available when no filters are selected", () => {
    const filters = { focus: "All", type: "All", category: "All", source: "All", windowDays: 1 } as const;

    expect(isTargetedScan(filters)).toBe(false);
    expect(searchTermsForFilters(filters).length).toBeGreaterThan(10);
  });
});

describe("resource categories", () => {
  it("exposes a broad practical category set for user-focused scans", () => {
    expect(resourceCategoryOptions).toEqual(
      expect.arrayContaining([
        "Official Docs",
        "MCP Servers",
        "Desktop Apps",
        "Browser Use",
        "Testing & Evals",
        "Cost & Rate Limits",
        "Rulebooks",
        "Videos & Demos",
      ]),
    );
  });

  it("classifies practical setup and reliability categories", () => {
    expect(classifyCategory("Codex Desktop Windows setup guide")).toBe("Desktop Apps");
    expect(classifyCategory("browser use automation with computer use")).toBe("Browser Use");
    expect(classifyCategory("rate limit pricing workaround")).toBe("Cost & Rate Limits");
    expect(classifyCategory("AGENTS.md rulebook for coding agents")).toBe("Rulebooks");
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

  it("boosts exact selected focus and category matches", () => {
    const targeted = computeSignalScore({
      source: "GitHub",
      ageMinutes: 180,
      score: 8,
      comments: 1,
      title: "OpenClaw MoltBot automation template",
      focus: "OpenClaw",
      category: "Automations",
      selectedFocus: "OpenClaw",
      selectedCategory: "Automations",
      windowDays: 7,
    });
    const generic = computeSignalScore({
      source: "GitHub",
      ageMinutes: 180,
      score: 8,
      comments: 1,
      title: "generic automation template",
      focus: "Agents",
      category: "Templates",
      selectedFocus: "OpenClaw",
      selectedCategory: "Automations",
      windowDays: 7,
    });

    expect(targeted).toBeGreaterThan(generic);
  });

  it("penalizes high-engagement stories that miss the selected practical category", () => {
    const exact = computeSignalScore({
      source: "GitHub",
      ageMinutes: 240,
      score: 10,
      comments: 2,
      title: "Codex Desktop Windows app setup guide",
      focus: "Codex",
      category: "Desktop Apps",
      selectedFocus: "Codex",
      selectedCategory: "Desktop Apps",
      windowDays: 30,
    });
    const offTarget = computeSignalScore({
      source: "Reddit",
      ageMinutes: 30,
      score: 500,
      comments: 200,
      title: "Both Codex and Claude got worse this week",
      focus: "Codex",
      category: "News",
      selectedFocus: "Codex",
      selectedCategory: "Desktop Apps",
      windowDays: 30,
    });

    expect(exact).toBeGreaterThan(offTarget);
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
