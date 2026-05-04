export type IntelSource = "Reddit" | "Hacker News" | "GitHub" | "Curated";

export type AiFocus =
  | "All"
  | "Codex"
  | "Claude"
  | "OpenAI"
  | "Anthropic"
  | "OpenClaw"
  | "Agents"
  | "DevTools";

export type NewsType =
  | "All"
  | "Model Releases"
  | "API Changes"
  | "Coding Agents"
  | "Benchmarks"
  | "Security"
  | "Research"
  | "Pricing";

export type ResourceCategory =
  | "All"
  | "News"
  | "Projects"
  | "Skills"
  | "Useful Tools"
  | "Useful Tricks"
  | "Guides"
  | "Prompts"
  | "Workflows"
  | "Official Docs"
  | "Release Notes"
  | "GitHub Repos"
  | "MCP Servers"
  | "Extensions"
  | "CLI Tools"
  | "Agent Setups"
  | "Automations"
  | "Templates"
  | "Troubleshooting"
  | "Local Setup"
  | "Integrations"
  | "Comparisons"
  | "Examples";

export type IntelItem = {
  id: string;
  title: string;
  source: IntelSource;
  url: string;
  author?: string;
  createdAt: string;
  ageMinutes: number;
  score: number;
  comments: number;
  focus: Exclude<AiFocus, "All">;
  type: Exclude<NewsType, "All">;
  category: Exclude<ResourceCategory, "All">;
  signal: "CRITICAL" | "USEFUL" | "WATCH";
  summary: string;
  whyItMatters: string;
  usefulnessReasons: string[];
  tags: string[];
};

export type IntelResponse = {
  generatedAt: string;
  windowDays: number;
  windowHours: number;
  liveSources: string[];
  redditSubreddits: string[];
  searchTerms: string[];
  scanMode: "broad" | "targeted";
  sourceErrors: Record<string, string>;
  items: IntelItem[];
};

export type IntelFilters = {
  focus: AiFocus;
  type: NewsType;
  category: ResourceCategory;
  source: "All" | IntelSource;
  windowDays: number;
  query?: string;
};

const focusTerms: Array<[Exclude<AiFocus, "All">, RegExp]> = [
  ["Codex", /\bcodex\b|gpt-5\.|openai-codex|codex cli/i],
  ["Claude", /\bclaude\b|anthropic|sonnet|opus|haiku/i],
  ["OpenAI", /\bopenai\b|chatgpt|gpt-|responses api|agents sdk/i],
  ["OpenClaw", /\bopenclaw\b|clawhub|clawdhub|moltbot|clawdbot|clawd ?bot|telegram bot manager/i],
  ["Anthropic", /\banthropic\b|claude|mcp/i],
  ["Agents", /\bagent\b|agents|tool use|mcp|browser use|computer use/i],
  ["DevTools", /\bcli\b|sdk|api|framework|ide|vscode|cursor|windsurf|repo|github/i],
];

const typeTerms: Array<[Exclude<NewsType, "All">, RegExp]> = [
  ["API Changes", /api|sdk|endpoint|responses|tool call|function call|breaking/i],
  ["Model Releases", /release|launched|new model|gpt-|sonnet|opus|haiku|llama|gemini/i],
  ["Coding Agents", /codex|agent|claude code|cursor|windsurf|mcp|tool use/i],
  ["Benchmarks", /benchmark|eval|score|swe-bench|leaderboard|performance/i],
  ["Security", /security|safety|jailbreak|prompt injection|vulnerability|cve/i],
  ["Research", /paper|arxiv|research|study|reasoning|alignment/i],
  ["Pricing", /price|pricing|rate limit|quota|billing|subscription|cost/i],
];

const categoryTerms: Array<[Exclude<ResourceCategory, "All">, RegExp]> = [
  ["Skills", /\bskill\b|skills|skill\.md|commands?|hooks?|workflow package/i],
  ["Prompts", /\bprompt\b|prompts|prompting|system prompt|claude\.md|agents\.md/i],
  ["Workflows", /\bworkflow\b|automation|agentic|orchestration|sub-?agent|multi-agent|pipeline/i],
  ["Troubleshooting", /troubleshoot|fix|bug|error|issue|problem|broken|workaround|debug/i],
  ["Guides", /\bguide\b|tutorial|walkthrough|how i|complete guide|explained|docs/i],
  ["Useful Tools", /\btool\b|tools|toolkit|mcp|extension|plugin|sdk|cli|library|repo|github/i],
  ["MCP Servers", /\bmcp server\b|model context protocol server|mcp tools?/i],
  ["Local Setup", /local setup|self-host|selfhosted|install|windows|desktop|docker|ollama|local ai/i],
  ["Projects", /\bproject\b|built|launched|showcase|open source|starter|template|boilerplate/i],
  ["Templates", /template|starter|boilerplate|scaffold|example app/i],
  ["Official Docs", /\bofficial docs?\b|documentation|docs diff|release notes?|changelog/i],
  ["Release Notes", /\brelease notes?\b|changelog|what'?s new|version|upgrade/i],
  ["GitHub Repos", /github|repo|repository|open source/i],
  ["Extensions", /extension|browser extension|vscode|chrome extension|plugin/i],
  ["CLI Tools", /\bcli\b|command line|terminal|powershell|shell/i],
  ["Agent Setups", /agent setup|subagent|multi-agent|agents\.md|claude\.md|codex config/i],
  ["Automations", /automation|automate|scheduled|cron|workflow automation|bot/i],
  ["Integrations", /integration|connector|api bridge|webhook|slack|github|telegram|browser/i],
  ["Comparisons", /compare|comparison|versus|\bvs\b|alternative|benchmark/i],
  ["Examples", /example|sample|demo|reference implementation/i],
  ["Useful Tricks", /\btrick\b|tips?|hack|cheat code|best practice|pattern|shortcut|setup/i],
  ["News", /\bnews\b|release|announc|update|breaking|launched|pricing|benchmark|security/i],
];

export function classifyFocus(text: string): Exclude<AiFocus, "All"> {
  return focusTerms.find(([, pattern]) => pattern.test(text))?.[0] ?? "Agents";
}

export function classifyType(text: string): Exclude<NewsType, "All"> {
  return typeTerms.find(([, pattern]) => pattern.test(text))?.[0] ?? "Coding Agents";
}

export function classifyCategory(text: string): Exclude<ResourceCategory, "All"> {
  return categoryTerms.find(([, pattern]) => pattern.test(text))?.[0] ?? "News";
}

export function ageMinutes(date: Date, now = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
}

export function computeSignalScore(input: {
  source: IntelSource;
  ageMinutes: number;
  score: number;
  comments: number;
  title: string;
  focus?: Exclude<AiFocus, "All">;
  category?: Exclude<ResourceCategory, "All">;
  selectedFocus?: AiFocus;
  selectedCategory?: ResourceCategory;
  windowDays?: number;
}): number {
  const windowMinutes = Math.max(1, input.windowDays ?? 1) * 1440;
  const recency = Math.max(0, 30 - (input.ageMinutes / windowMinutes) * 24);
  const engagement = Math.min(28, Math.log10(input.score + input.comments + 10) * 12);
  const sourceWeight = input.source === "GitHub" ? 18 : input.source === "Hacker News" ? 13 : 12;
  const criticalBoost = /breaking|release|api|codex|claude|security|rate limit|benchmark/i.test(
    input.title,
  )
    ? 10
    : 6;
  const actionableBoost = usefulActionTerms(input.title).length * 4;
  const focusBoost = input.selectedFocus !== "All" && input.focus === input.selectedFocus ? 12 : 0;
  const categoryBoost = input.selectedCategory !== "All" && input.category === input.selectedCategory ? 10 : 0;

  return Math.min(99, Math.round(recency + engagement + sourceWeight + criticalBoost + actionableBoost + focusBoost + categoryBoost));
}

export function signalFromScore(score: number): IntelItem["signal"] {
  if (score >= 82) return "CRITICAL";
  if (score >= 62) return "USEFUL";
  return "WATCH";
}

export function summarize(source: IntelSource, type: string): string {
  return `${source} signal tagged as ${type.toLowerCase()} for developer workflow triage.`;
}

export function whyItMatters(focus: string, type: string): string {
  return `${focus} users should review this ${type.toLowerCase()} signal because it may contain a tool, workflow, fix, setup, prompt, repo, or change you can actually use.`;
}

export function usefulActionTerms(text: string): string[] {
  const checks: Array<[string, RegExp]> = [
    ["hands-on guide", /guide|tutorial|walkthrough|how to|explained/i],
    ["usable project or repo", /github|repo|repository|open source|project|template|starter|boilerplate/i],
    ["tool you can try", /tool|toolkit|plugin|extension|sdk|cli|library|mcp server/i],
    ["workflow or automation", /workflow|automation|pipeline|agentic|multi-agent|subagent|bot/i],
    ["prompt or skill asset", /prompt|skills?|skill\.md|agents\.md|claude\.md|hooks?|commands?/i],
    ["fix or troubleshooting value", /fix|bug|error|issue|workaround|troubleshoot|debug/i],
    ["official or release signal", /official|docs|documentation|release notes?|changelog|version/i],
    ["local setup value", /local|self-host|selfhosted|install|desktop|windows|docker|ollama/i],
  ];

  return checks.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

export function usefulnessReasonsForItem(input: {
  title: string;
  source: IntelSource;
  focus: Exclude<AiFocus, "All">;
  type: Exclude<NewsType, "All">;
  category: Exclude<ResourceCategory, "All">;
  ageMinutes: number;
  score: number;
  comments: number;
}): string[] {
  const reasons = [
    `${input.focus} / ${input.category}`,
    ...usefulActionTerms(input.title),
    `${input.source} signal`,
  ];

  if (input.ageMinutes <= 1440) reasons.push("fresh within 24h");
  if (input.comments > 10) reasons.push("active discussion");
  if (input.score > 70) reasons.push("high usefulness score");

  return Array.from(new Set(reasons)).slice(0, 5);
}

const focusSearchTerms: Record<Exclude<AiFocus, "All">, string[]> = {
  Codex: [
    "codex",
    "codex cli",
    "codex desktop",
    "openai codex",
    "codex agent",
    "codex skills",
    "codex hooks",
  ],
  OpenClaw: [
    "openclaw",
    "clawhub",
    "clawdhub",
    "moltbot",
    "clawdbot",
    "clawd bot",
    "telegram bot manager",
    "openclaw gateway",
    "openclaw slash commands",
    "openclaw bots",
  ],
  Claude: [
    "claude",
    "claude code",
    "claude desktop",
    "anthropic claude",
    "claude mcp",
    "claude code skills",
    "claude hooks",
  ],
  OpenAI: [
    "openai",
    "chatgpt",
    "openai api",
    "responses api",
    "openai agents",
    "gpt",
    "chatgpt tools",
  ],
  Anthropic: [
    "anthropic",
    "claude",
    "claude api",
    "model context protocol",
    "mcp",
    "anthropic tools",
  ],
  Agents: [
    "ai agent",
    "coding agent",
    "agentic workflow",
    "multi agent",
    "mcp server",
    "tool use",
    "subagent",
  ],
  DevTools: [
    "developer tools",
    "ai coding tool",
    "cli",
    "sdk",
    "github repo",
    "vscode extension",
    "cursor",
    "windsurf",
  ],
};

const categorySearchTerms: Record<Exclude<ResourceCategory, "All">, string[]> = {
  News: ["news", "release", "update", "announcement", "breaking", "changelog", "launch"],
  Projects: ["project", "open source", "github repo", "starter", "template", "boilerplate", "showcase"],
  Skills: ["skills", "skill.md", "commands", "hooks", "agents.md", "claude.md", "workflow package"],
  "Useful Tools": ["tools", "toolkit", "plugin", "extension", "mcp server", "sdk", "cli", "library", "repository"],
  "Useful Tricks": ["tips", "tricks", "best practices", "shortcut", "setup", "workflow trick", "hidden feature"],
  Guides: ["guide", "tutorial", "walkthrough", "how to", "docs", "explained", "setup guide"],
  Prompts: ["prompts", "prompting", "system prompt", "prompt pattern", "prompt engineering", "instructions"],
  Workflows: ["workflow", "automation", "agentic", "orchestration", "pipeline", "multi-agent", "subagent"],
  "Official Docs": ["official docs", "documentation", "docs", "manual", "reference", "release notes"],
  "Release Notes": ["release notes", "changelog", "version", "upgrade", "migration", "what's new"],
  "GitHub Repos": ["github repo", "repository", "open source", "stars", "fork", "awesome list"],
  "MCP Servers": ["mcp server", "model context protocol", "mcp tools", "mcp config", "connector"],
  Extensions: ["extension", "plugin", "vscode extension", "browser extension", "chrome extension"],
  "CLI Tools": ["cli", "command line", "terminal", "shell", "powershell", "npm package"],
  "Agent Setups": ["agent setup", "subagent", "multi-agent", "agents.md", "claude.md", "codex config"],
  Automations: ["automation", "automate", "bot", "scheduled", "workflow automation", "autonomous"],
  Templates: ["template", "starter", "boilerplate", "scaffold", "example app", "reference implementation"],
  Troubleshooting: ["fix", "bug", "error", "issue", "workaround", "debug", "troubleshooting"],
  "Local Setup": ["local setup", "self-hosted", "desktop", "windows", "docker", "install", "ollama"],
  Integrations: ["integration", "connector", "webhook", "github", "slack", "telegram", "browser"],
  Comparisons: ["comparison", "compare", "versus", "vs", "alternative", "benchmark"],
  Examples: ["example", "sample", "demo", "reference", "case study"],
};

const typeSearchTerms: Record<Exclude<NewsType, "All">, string[]> = {
  "Model Releases": ["model release", "new model", "release", "gpt", "sonnet", "opus", "llama", "gemini"],
  "API Changes": ["api", "sdk", "endpoint", "responses api", "tool calls", "breaking change", "rate limit"],
  "Coding Agents": ["coding agent", "codex", "claude code", "cursor", "windsurf", "mcp", "tool use"],
  Benchmarks: ["benchmark", "eval", "swe-bench", "leaderboard", "performance", "comparison"],
  Security: ["security", "safety", "prompt injection", "jailbreak", "vulnerability", "guardrails"],
  Research: ["research", "paper", "arxiv", "reasoning", "alignment", "study"],
  Pricing: ["pricing", "price", "billing", "quota", "rate limit", "subscription", "cost"],
};

export const defaultQueries = [
  "codex",
  "codex desktop",
  "codex skills",
  "codex hooks",
  "codex useful tools",
  "codex tricks",
  "claude code",
  "claude code skills",
  "claude code hooks",
  "claude code useful tools",
  "claude code tricks",
  "chatgpt",
  "chatgpt prompts",
  "chatgpt useful tools",
  "chatgpt tricks",
  "openai agents",
  "anthropic claude",
  "mcp",
  "mcp tools",
  "mcp servers",
  "openclaw",
  "clawhub",
  "clawdhub",
  "hermes",
  "moltbot",
  "clawdbot",
  "openclaw gateway",
  "openclaw bots",
  "ai projects",
  "ai tools",
  "ai workflow",
  "ai guide",
  "ai coding agent",
  "openai api",
];

export function isTargetedScan(filters: IntelFilters): boolean {
  return (
    filters.focus !== "All" ||
    filters.type !== "All" ||
    filters.category !== "All" ||
    filters.source !== "All" ||
    Boolean(filters.query?.trim())
  );
}

export function searchTermsForFilters(filters: IntelFilters): string[] {
  const focusTerms = filters.focus === "All" ? [] : focusSearchTerms[filters.focus];
  const categoryTerms = filters.category === "All" ? [] : categorySearchTerms[filters.category];
  const newsTypeTerms = filters.type === "All" ? [] : typeSearchTerms[filters.type];
  const typedTerms = filters.query
    ?.split(/[,\s]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !/^(filter:|source:|impact:|last24|all|high)$/i.test(term));

  const pairedFocusCategory =
    focusTerms.length > 0 && categoryTerms.length > 0
      ? focusTerms.flatMap((focusTerm) =>
          categoryTerms.slice(0, 8).map((categoryTerm) => `${focusTerm} ${categoryTerm}`),
        )
      : [];
  const pairedFocusType =
    focusTerms.length > 0 && newsTypeTerms.length > 0
      ? focusTerms.flatMap((focusTerm) => newsTypeTerms.slice(0, 5).map((typeTerm) => `${focusTerm} ${typeTerm}`))
      : [];

  const fallback = defaultQueries.slice(0, 18);
  const terms = [
    ...pairedFocusCategory,
    ...pairedFocusType,
    ...focusTerms,
    ...categoryTerms,
    ...newsTypeTerms,
    ...(typedTerms ?? []),
    ...(isTargetedScan(filters) ? [] : fallback),
  ];

  const unique = Array.from(new Set(terms.map((term) => term.trim()).filter(Boolean)));
  return unique.length > 0 ? unique.slice(0, 36) : fallback;
}

export function applySelectedFilterLabels(item: IntelItem, filters: IntelFilters): IntelItem {
  const focus = filters.focus === "All" ? item.focus : filters.focus;
  const type = filters.type === "All" ? item.type : filters.type;
  const category = filters.category === "All" ? item.category : filters.category;

  return {
    ...item,
    focus,
    type,
    category,
    tags: Array.from(new Set([...item.tags, focus, type, category])),
    summary: summarize(item.source, type),
    whyItMatters: whyItMatters(focus, type),
  };
}

export const redditSourceSubreddits = [
  "codex",
  "OpenAI",
  "ChatGPT",
  "ClaudeAI",
  "ClaudeCode",
  "Anthropic",
  "ArtificialInteligence",
  "artificial",
  "singularity",
  "LocalLLaMA",
  "MachineLearning",
  "learnmachinelearning",
  "deeplearning",
  "LanguageTechnology",
  "PromptEngineering",
  "AutoGPT",
  "AgenticAI",
  "AIAgents",
  "AI_Agents",
  "AIcoding",
  "AIProgramming",
  "programming",
  "webdev",
  "devops",
  "selfhosted",
  "opensource",
  "github",
  "SideProject",
  "SaaS",
  "mcp",
  "OpenClaw",
  "ClawHub",
  "HermesAI",
  "HermesLLM",
  "LocalAI",
];
