"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  focusFilterOptions,
  formatWindowLabel,
  newsTypeOptions,
  resourceCategoryOptions,
  windowDayOptions,
  type AiFocus,
  type IntelItem,
  type IntelResponse,
  type NewsType,
  type ResourceCategory,
} from "@/lib/intel";

const sourceOptions = ["All", "Reddit", "Hacker News", "GitHub"] as const;
type SourceFilter = (typeof sourceOptions)[number];

function windowCommandToken(days: number) {
  return days === 1 ? "last24" : `last${days}d`;
}

function defaultCommandForWindow(days: number) {
  return `filter: window:${windowCommandToken(days)} source:reddit,hn,github impact:high`;
}

function isGeneratedWindowCommand(value: string) {
  return /^filter:\s+window:last(?:24|\d+d)\s+source:reddit,hn,github\s+impact:high$/i.test(value.trim());
}

const manualWatchlist = [
  "Codex CLI",
  "Codex Desktop",
  "OpenClaw Gateway",
  "ClawHub",
  "MoltBot",
  "Claude Code",
  "MCP servers",
  "Responses API",
  "SWE-bench",
  "rate limits",
];

function formatAge(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function signalClass(signal: IntelItem["signal"]) {
  if (signal === "CRITICAL") return "border-red-400/60 bg-red-500/12 text-red-200 shadow-red-500/10";
  if (signal === "USEFUL") return "border-amber-300/60 bg-amber-300/12 text-amber-100 shadow-amber-500/10";
  return "border-emerald-300/50 bg-emerald-300/10 text-emerald-100 shadow-emerald-500/10";
}

function sourceClass(source: string) {
  if (source === "Reddit") return "border-orange-300/50 text-orange-100";
  if (source === "Hacker News") return "border-amber-300/50 text-amber-100";
  if (source === "GitHub") return "border-sky-300/50 text-sky-100";
  return "border-zinc-500 text-zinc-200";
}

function seededItems(): IntelItem[] {
  const now = Date.now();
  const items: Array<
    Pick<IntelItem, "title" | "source" | "score" | "comments" | "focus" | "type" | "category" | "signal">
  > = [
    {
      title: "Codex CLI workflow update spotted across developer threads",
      source: "Reddit",
      score: 91,
      comments: 42,
      focus: "Codex",
      type: "Coding Agents",
      category: "News",
      signal: "CRITICAL",
    },
    {
      title: "Claude tool-use patterns gain traction in production agent repos",
      source: "Hacker News",
      score: 84,
      comments: 31,
      focus: "Claude",
      type: "API Changes",
      category: "Skills",
      signal: "CRITICAL",
    },
    {
      title: "MCP server templates trending for local automation dashboards",
      source: "GitHub",
      score: 71,
      comments: 18,
      focus: "Agents",
      type: "Coding Agents",
      category: "Useful Tools",
      signal: "USEFUL",
    },
  ];

  return items.map((item, index) => ({
    ...item,
    id: `seed-${index}`,
    url: "https://example.com",
    author: "seed",
    createdAt: new Date(now - (index + 1) * 53 * 60_000).toISOString(),
    ageMinutes: (index + 1) * 53,
    summary: "Local preview seed shown while live source calls warm up or rate-limit.",
    whyItMatters: "This preserves the dashboard shape while the real aggregator reports source status.",
    usefulnessReasons: [item.focus, item.category, "preview seed"],
    tags: [item.focus, item.type, item.category, item.source],
  }));
}

export default function TerminalIntelApp() {
  const [payload, setPayload] = useState<IntelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<AiFocus>("All");
  const [type, setType] = useState<NewsType>("All");
  const [source, setSource] = useState<SourceFilter>("All");
  const [category, setCategory] = useState<ResourceCategory>("All");
  const [windowDays, setWindowDays] = useState(1);
  const [minScore, setMinScore] = useState(45);
  const [query, setQuery] = useState(defaultCommandForWindow(1));
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query).toLowerCase();

  useEffect(() => {
    let cancelled = false;

    async function loadIntel() {
      try {
        const params = new URLSearchParams();
        if (focus !== "All") params.set("focus", focus);
        if (type !== "All") params.set("type", type);
        if (category !== "All") params.set("category", category);
        if (source !== "All") params.set("source", source);
        params.set("windowDays", String(windowDays));
        if (query.trim() && !isGeneratedWindowCommand(query)) params.set("q", query);
        const url = params.size > 0 ? `/api/intel?${params.toString()}` : "/api/intel";
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const data = (await response.json()) as IntelResponse;
        if (!cancelled) {
          setPayload(data);
          setError(null);
          setSelectedId(data.items[0]?.id ?? null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load live intel");
          setPayload({
            generatedAt: new Date().toISOString(),
            windowDays,
            windowHours: windowDays * 24,
            liveSources: [],
            redditSubreddits: [
              "codex",
              "OpenAI",
              "ChatGPT",
              "ClaudeAI",
              "ClaudeCode",
              "Anthropic",
              "LocalLLaMA",
              "OpenClaw",
              "ClawHub",
              "HermesAI",
            ],
            searchTerms: [],
            scanMode: "targeted",
            sourceErrors: { Local: "Using preview seed because live aggregation failed." },
            items: seededItems(),
          });
        }
      }
    }

    loadIntel();
    const interval = window.setInterval(loadIntel, 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [category, focus, query, source, type, windowDays]);

  const items = payload?.items ?? seededItems();
  const filtered = useMemo(() => {
    const tokens = deferredQuery
      .replace(/filter:|source:|impact:|last24|reddit,hn,github/g, "")
      .replace(/window:|last\s*\d+\s*(days?|d|h|hours?)|\b\d+d\b/g, "")
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => !["high", "useful", "critical", "all"].includes(part))
      .filter(Boolean);

    return items.filter((item) => {
      const text = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
      const matchesQuery = tokens.length === 0 || tokens.every((token) => text.includes(token));
      const matchesFocus = focus === "All" || item.focus === focus;
      const matchesType = type === "All" || item.type === type;
      const matchesCategory = category === "All" || item.category === category;
      const matchesSource = source === "All" || item.source === source;
      return matchesQuery && matchesFocus && matchesType && matchesCategory && matchesSource && item.score >= minScore;
    });
  }, [category, deferredQuery, focus, items, minScore, source, type]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? items[0];
  const sourceErrors = payload?.sourceErrors ?? {};
  const criticalCount = filtered.filter((item) => item.signal === "CRITICAL").length;
  const avgScore = filtered.length
    ? Math.round(filtered.reduce((total, item) => total + item.score, 0) / filtered.length)
    : 0;

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    startTransition(() => setter(value));
  }

  function updateWindowFilter(days: number) {
    startTransition(() => {
      setWindowDays(days);
      setQuery((current) =>
        isGeneratedWindowCommand(current)
          ? defaultCommandForWindow(days)
          : current.replace(/window:last(?:24|\d+d)/i, `window:${windowCommandToken(days)}`),
      );
    });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#113d32_0,#050807_34%,#020303_70%)] text-emerald-50">
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(132,255,198,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(132,255,198,.8)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-4 px-4 py-4 lg:px-6">
        <header className="flex flex-col gap-3 border border-emerald-300/20 bg-black/45 p-4 shadow-2xl shadow-emerald-950/30 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.42em] text-emerald-300/80">Terminal Intel</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
              AI news signal console
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-xs text-emerald-100">
            <div className="border border-emerald-300/20 bg-emerald-300/10 p-3">
              <span className="block text-emerald-300/60">WINDOW</span>
              {formatWindowLabel(payload?.windowDays ?? windowDays).toUpperCase()}
            </div>
            <div className="border border-emerald-300/20 bg-emerald-300/10 p-3">
              <span className="block text-emerald-300/60">SIGNALS</span>
              {filtered.length}
            </div>
            <div className="border border-emerald-300/20 bg-emerald-300/10 p-3">
              <span className="block text-emerald-300/60">AVG SCORE</span>
              {avgScore}
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_380px]">
          <aside className="border border-emerald-300/20 bg-black/50 p-4 font-mono shadow-xl shadow-black/30">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.32em] text-emerald-300">Focus</span>
              <span className={`h-2 w-2 rounded-full ${isPending ? "bg-amber-300" : "bg-emerald-300"}`} />
            </div>
            <div className="space-y-2">
              {focusFilterOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => updateFilter(setFocus, option)}
                  className={`w-full border px-3 py-2 text-left text-sm transition hover:border-emerald-200 hover:bg-emerald-300/10 ${
                    focus === option
                      ? "border-emerald-300 bg-emerald-300/15 text-white"
                      : "border-emerald-300/15 text-emerald-100/70"
                  }`}
                >
                  ./focus --{option.toLowerCase().replaceAll(" ", "-")}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <span className="text-xs uppercase tracking-[0.32em] text-emerald-300">Window</span>
              <div className="mt-3 grid max-h-32 grid-cols-5 gap-1 overflow-y-auto pr-1">
                {windowDayOptions.map((days) => (
                  <button
                    key={days}
                    onClick={() => updateWindowFilter(days)}
                    className={`border px-2 py-1.5 text-center text-[11px] transition hover:border-cyan-200 hover:bg-cyan-300/10 ${
                      windowDays === days
                        ? "border-cyan-300 bg-cyan-300/15 text-cyan-100"
                        : "border-emerald-300/15 text-emerald-100/65"
                    }`}
                    title={formatWindowLabel(days)}
                  >
                    {days === 1 ? "24h" : `${days}d`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <span className="text-xs uppercase tracking-[0.32em] text-emerald-300">Type</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {newsTypeOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => updateFilter(setType, option)}
                    className={`border px-2 py-1 text-xs ${
                      type === option
                        ? "border-amber-300 bg-amber-300/15 text-amber-100"
                        : "border-emerald-300/15 text-emerald-100/65"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <span className="text-xs uppercase tracking-[0.32em] text-emerald-300">Category</span>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {resourceCategoryOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => updateFilter(setCategory, option)}
                    className={`w-full border px-3 py-2 text-left text-xs transition hover:border-cyan-200 hover:bg-cyan-300/10 ${
                      category === option
                        ? "border-cyan-300 bg-cyan-300/15 text-cyan-100"
                        : "border-emerald-300/15 text-emerald-100/65"
                    }`}
                  >
                    category:{option.toLowerCase().replaceAll(" ", "-")}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="text-xs uppercase tracking-[0.32em] text-emerald-300" htmlFor="score">
                Min usefulness
              </label>
              <input
                id="score"
                type="range"
                min="0"
                max="95"
                value={minScore}
                onChange={(event) => updateFilter(setMinScore, Number(event.target.value))}
                className="mt-3 w-full accent-emerald-300"
              />
              <div className="text-right text-sm text-emerald-100">{minScore}</div>
            </div>
          </aside>

          <section className="min-w-0 border border-emerald-300/20 bg-black/45 shadow-xl shadow-black/30">
            <div className="border-b border-emerald-300/15 p-4">
              <label className="sr-only" htmlFor="command">
                Command filter
              </label>
              <input
                id="command"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full border border-emerald-300/25 bg-[#030706] px-4 py-3 font-mono text-sm text-emerald-50 outline-none transition placeholder:text-emerald-200/35 focus:border-cyan-300 focus:shadow-[0_0_0_3px_rgba(103,232,249,.12)]"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {sourceOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => updateFilter(setSource, option)}
                    className={`border px-3 py-1.5 font-mono text-xs ${
                      source === option
                        ? "border-cyan-300 bg-cyan-300/10 text-cyan-100"
                        : "border-emerald-300/15 text-emerald-100/65"
                    }`}
                  >
                    source:{option}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px] text-emerald-100/55">
                <span className="border border-emerald-300/15 bg-emerald-300/5 px-2 py-1">
                  scan:{payload?.scanMode ?? "broad"}
                </span>
                <span className="border border-emerald-300/15 bg-emerald-300/5 px-2 py-1">
                  window:{formatWindowLabel(payload?.windowDays ?? windowDays).toLowerCase()}
                </span>
                <span className="border border-emerald-300/15 bg-emerald-300/5 px-2 py-1">
                  backend terms:{payload?.searchTerms.length ?? 0}
                </span>
                {(payload?.searchTerms ?? []).slice(0, 10).map((term) => (
                  <span key={term} className="border border-cyan-300/10 bg-cyan-300/5 px-2 py-1 text-cyan-100/60">
                    {term}
                  </span>
                ))}
              </div>
            </div>

            <div className="max-h-[calc(100vh-245px)] space-y-3 overflow-y-auto p-4">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`group w-full border p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-cyan-300/5 ${
                    selected?.id === item.id
                      ? "border-cyan-300/80 bg-cyan-300/10"
                      : "border-emerald-300/15 bg-[#06100d]/80"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className={`border px-2 py-1 ${signalClass(item.signal)}`}>{item.signal}</span>
                    <span className={`border px-2 py-1 ${sourceClass(item.source)}`}>{item.source}</span>
                    <span className="border border-emerald-300/20 px-2 py-1 text-emerald-200/80">{formatAge(item.ageMinutes)}</span>
                    <span className="ml-auto text-emerald-300">score:{item.score}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold leading-tight tracking-[-0.02em] text-white group-hover:text-cyan-100">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-100/68">{item.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.usefulnessReasons.slice(0, 3).map((reason) => (
                      <span
                        key={reason}
                        className="border border-amber-300/15 bg-amber-300/5 px-2 py-1 font-mono text-[11px] text-amber-100/70"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="border border-emerald-300/10 bg-emerald-300/5 px-2 py-1 font-mono text-[11px] text-emerald-100/60">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              {filtered.length === 0 ? (
                <div className="border border-amber-300/30 bg-amber-300/10 p-6 font-mono text-amber-100">
                  No signals match this command. Lower the score threshold or change focus filters.
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="border border-emerald-300/20 bg-black/55 p-4 shadow-xl shadow-black/30">
              <div className="mb-3 flex items-center justify-between font-mono text-xs text-emerald-300">
                <span>STORY ANALYSIS</span>
                <span>{selected ? selected.signal : "IDLE"}</span>
              </div>
              {selected ? (
                <>
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-white">{selected.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-emerald-100/72">{selected.whyItMatters}</p>
                  <div className="mt-4">
                    <span className="font-mono text-xs uppercase tracking-[0.24em] text-emerald-300/80">
                      Why this is ranked
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.usefulnessReasons.map((reason) => (
                        <span
                          key={reason}
                          className="border border-amber-300/15 bg-amber-300/5 px-2 py-1 font-mono text-[11px] text-amber-100/75"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
                    <div className="border border-emerald-300/15 p-3">
                      <span className="block text-emerald-300/60">FOCUS</span>
                      {selected.focus}
                    </div>
                    <div className="border border-emerald-300/15 p-3">
                      <span className="block text-emerald-300/60">TYPE</span>
                      {selected.type}
                    </div>
                    <div className="border border-emerald-300/15 p-3">
                      <span className="block text-emerald-300/60">CATEGORY</span>
                      {selected.category}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-3">
                    <div className="border border-emerald-300/15 p-3">
                      <span className="block text-emerald-300/60">DISCUSS</span>
                      {selected.comments}
                    </div>
                  </div>
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center border border-cyan-300/70 bg-cyan-300/10 px-4 py-3 font-mono text-sm text-cyan-100 transition hover:bg-cyan-300/20"
                  >
                    open original source
                  </a>
                </>
              ) : null}
            </section>

            <section className="border border-emerald-300/20 bg-black/55 p-4 font-mono shadow-xl shadow-black/30">
              <h2 className="text-xs uppercase tracking-[0.32em] text-emerald-300">Source telemetry</h2>
              <div className="mt-4 space-y-2 text-sm">
                {sourceOptions.slice(1).map((option) => (
                  <div key={option} className="flex items-center justify-between border border-emerald-300/10 p-2">
                    <span>{option}</span>
                    <span className={payload?.liveSources.includes(option) ? "text-emerald-300" : "text-amber-200"}>
                      {payload?.liveSources.includes(option) ? "connected" : "limited"}
                    </span>
                  </div>
                ))}
              </div>
              {Object.keys(sourceErrors).length > 0 ? (
                <div className="mt-3 border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">
                  {Object.entries(sourceErrors).map(([name, message]) => (
                    <p key={name}>
                      {name}: {message}
                    </p>
                  ))}
                </div>
              ) : null}
              {error ? <p className="mt-3 text-xs text-red-200">API error: {error}</p> : null}
            </section>

            <section className="border border-emerald-300/20 bg-black/55 p-4 shadow-xl shadow-black/30">
              <h2 className="font-mono text-xs uppercase tracking-[0.32em] text-emerald-300">Alert watchlist</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {manualWatchlist.map((item) => (
                  <span key={item} className="border border-emerald-300/15 bg-emerald-300/5 px-3 py-2 font-mono text-xs text-emerald-100/75">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 border border-red-300/25 bg-red-500/10 p-3 font-mono text-xs text-red-100">
                {criticalCount} critical signals currently match your focus.
              </div>
            </section>

            <section className="border border-emerald-300/20 bg-black/55 p-4 shadow-xl shadow-black/30">
              <div className="mb-3 flex items-center justify-between font-mono text-xs uppercase tracking-[0.24em] text-emerald-300">
                <span>Reddit sources</span>
                <span>{payload?.redditSubreddits.length ?? 0}</span>
              </div>
              <div className="max-h-40 overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {(payload?.redditSubreddits ?? []).map((subreddit) => (
                    <span
                      key={subreddit}
                      className="border border-emerald-300/15 bg-emerald-300/5 px-2 py-1 font-mono text-[11px] text-emerald-100/70"
                    >
                      r/{subreddit}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
