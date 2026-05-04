import { NextResponse } from "next/server";
import {
  ageMinutes,
  applySelectedFilterLabels,
  classifyCategory,
  classifyFocus,
  classifyType,
  computeSignalScore,
  focusFilterOptions,
  isTargetedScan,
  newsTypeOptions,
  normalizeWindowDays,
  redditSourceSubreddits,
  resourceCategoryOptions,
  searchTermsForFilters,
  signalFromScore,
  summarize,
  usefulnessReasonsForItem,
  whyItMatters,
  type IntelFilters,
  type IntelItem,
  type IntelResponse,
  type IntelSource,
} from "@/lib/intel";

export const dynamic = "force-dynamic";

const headers = {
  "User-Agent": "TerminalIntelAINews/0.1 by local-dev",
  Accept: "application/json",
};

const sourceValues: Array<"All" | IntelSource> = ["All", "Reddit", "Hacker News", "GitHub", "Curated"];

function enumParam<T extends string>(params: URLSearchParams, name: string, values: readonly T[], fallback: T): T {
  const value = params.get(name);
  return values.includes(value as T) ? (value as T) : fallback;
}

function filtersFromRequest(request: Request): IntelFilters {
  const params = new URL(request.url).searchParams;

  return {
    focus: enumParam(params, "focus", focusFilterOptions, "All"),
    type: enumParam(params, "type", newsTypeOptions, "All"),
    category: enumParam(params, "category", resourceCategoryOptions, "All"),
    source: enumParam(params, "source", sourceValues, "All"),
    windowDays: normalizeWindowDays(params.get("windowDays")),
    query: params.get("q") ?? undefined,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function redditQuery(terms: string[]): string {
  return terms
    .slice(0, 20)
    .map((term) => (term.includes(" ") ? `"${term}"` : term))
    .join(" OR ");
}

function redditTimeRange(windowDays: number): "day" | "week" | "month" {
  if (windowDays <= 1) return "day";
  if (windowDays <= 7) return "week";
  return "month";
}

type RedditChild = {
  data: {
    id: string;
    title: string;
    permalink: string;
    url: string;
    author?: string;
    created_utc: number;
    score: number;
    num_comments: number;
    subreddit: string;
  };
};

async function redditSignals(now: Date, terms: string[], filters: IntelFilters): Promise<IntelItem[]> {
  const after = Math.floor((now.getTime() - filters.windowDays * 24 * 60 * 60 * 1000) / 1000);
  const query = encodeURIComponent(redditQuery(terms));
  const timeRange = redditTimeRange(filters.windowDays);
  const limit = filters.windowDays > 7 ? 50 : 35;
  const urls = redditSourceSubreddits.map((subreddit) => {
    return `https://www.reddit.com/r/${subreddit}/search.json?q=${query}&restrict_sr=1&sort=new&t=${timeRange}&limit=${limit}`;
  });
  const results = await Promise.allSettled(
    urls.map((url) => fetchJson<{ data: { children: RedditChild[] } }>(url)),
  );

  return results.flatMap((result) => {
    if (result.status === "rejected") return [];

    return result.value.data.children
      .filter((child) => child.data.created_utc >= after)
      .map((child) => {
        const createdAt = new Date(child.data.created_utc * 1000);
        const text = `${child.data.title} ${child.data.subreddit}`;
        const focus = classifyFocus(text);
        const type = classifyType(text);
        const category = classifyCategory(text);
        const minutes = ageMinutes(createdAt, now);
        const score = computeSignalScore({
          source: "Reddit",
          ageMinutes: minutes,
          score: child.data.score,
          comments: child.data.num_comments,
          title: child.data.title,
          focus,
          category,
          selectedFocus: filters.focus,
          selectedCategory: filters.category,
          windowDays: filters.windowDays,
        });

        const item = {
          id: `reddit-${child.data.id}`,
          title: child.data.title,
          source: "Reddit",
          url: `https://www.reddit.com${child.data.permalink}`,
          author: child.data.author,
          createdAt: createdAt.toISOString(),
          ageMinutes: minutes,
          score,
          comments: child.data.num_comments,
          focus,
          type,
          category,
          signal: signalFromScore(score),
          summary: summarize("Reddit", type),
          whyItMatters: whyItMatters(focus, type),
          usefulnessReasons: usefulnessReasonsForItem({
            title: child.data.title,
            source: "Reddit",
            focus,
            type,
            category,
            ageMinutes: minutes,
            score,
            comments: child.data.num_comments,
          }),
          tags: [child.data.subreddit, focus, type, category],
        } satisfies IntelItem;

        return applySelectedFilterLabels(item, filters);
      });
  });
}

type HnHit = {
  objectID: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  author?: string;
  created_at: string;
  points?: number;
  num_comments?: number;
};

async function hackerNewsSignals(now: Date, terms: string[], filters: IntelFilters): Promise<IntelItem[]> {
  const unixAfter = Math.floor((now.getTime() - filters.windowDays * 24 * 60 * 60 * 1000) / 1000);
  const queries = terms.slice(0, filters.windowDays > 7 ? 18 : 14);
  const results = await Promise.allSettled(
    queries.map((query) =>
      fetchJson<{ hits: HnHit[] }>(
        `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
          query,
        )}&tags=story&numericFilters=created_at_i>${unixAfter}`,
      ),
    ),
  );

  return results.flatMap((result) => {
    if (result.status === "rejected") return [];

    return result.value.hits.map((hit) => {
      const title = hit.title ?? hit.story_title ?? "Untitled Hacker News item";
      const createdAt = new Date(hit.created_at);
      const focus = classifyFocus(title);
      const type = classifyType(title);
      const category = classifyCategory(title);
      const minutes = ageMinutes(createdAt, now);
      const score = computeSignalScore({
        source: "Hacker News",
        ageMinutes: minutes,
        score: hit.points ?? 0,
        comments: hit.num_comments ?? 0,
        title,
        focus,
        category,
        selectedFocus: filters.focus,
        selectedCategory: filters.category,
        windowDays: filters.windowDays,
      });

      const item = {
        id: `hn-${hit.objectID}`,
        title,
        source: "Hacker News",
        url: hit.url ?? hit.story_url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author,
        createdAt: createdAt.toISOString(),
        ageMinutes: minutes,
        score,
        comments: hit.num_comments ?? 0,
        focus,
        type,
        category,
        signal: signalFromScore(score),
        summary: summarize("Hacker News", type),
        whyItMatters: whyItMatters(focus, type),
        usefulnessReasons: usefulnessReasonsForItem({
          title,
          source: "Hacker News",
          focus,
          type,
          category,
          ageMinutes: minutes,
          score,
          comments: hit.num_comments ?? 0,
        }),
        tags: ["HN", focus, type, category],
      } satisfies IntelItem;

      return applySelectedFilterLabels(item, filters);
    });
  });
}

type GitHubRepo = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  updated_at: string;
  stargazers_count: number;
  open_issues_count: number;
  owner: { login: string };
};

async function githubSignals(now: Date, terms: string[], filters: IntelFilters): Promise<IntelItem[]> {
  const date = new Date(now.getTime() - filters.windowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const results = await Promise.allSettled(
    terms.slice(0, filters.windowDays > 7 ? 12 : 8).map((term) =>
      fetchJson<{ items: GitHubRepo[] }>(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(
          `${term} pushed:>${date}`,
        )}&sort=updated&order=desc&per_page=${filters.windowDays > 7 ? 15 : 10}`,
      ),
    ),
  );

  return results.flatMap((result) => {
    if (result.status === "rejected") return [];

    return result.value.items.map((repo) => {
      const title = `${repo.full_name}: ${repo.description ?? "repository updated"}`;
      const createdAt = new Date(repo.updated_at);
      const focus = classifyFocus(title);
      const type = classifyType(title);
      const category = classifyCategory(title);
      const minutes = ageMinutes(createdAt, now);
      const score = computeSignalScore({
        source: "GitHub",
        ageMinutes: minutes,
        score: repo.stargazers_count,
        comments: repo.open_issues_count,
        title,
        focus,
        category,
        selectedFocus: filters.focus,
        selectedCategory: filters.category,
        windowDays: filters.windowDays,
      });

      const item = {
        id: `github-${repo.id}`,
        title,
        source: "GitHub",
        url: repo.html_url,
        author: repo.owner.login,
        createdAt: createdAt.toISOString(),
        ageMinutes: minutes,
        score,
        comments: repo.open_issues_count,
        focus,
        type,
        category,
        signal: signalFromScore(score),
        summary: summarize("GitHub", type),
        whyItMatters: whyItMatters(focus, type),
        usefulnessReasons: usefulnessReasonsForItem({
          title,
          source: "GitHub",
          focus,
          type,
          category,
          ageMinutes: minutes,
          score,
          comments: repo.open_issues_count,
        }),
        tags: ["repo", focus, type, category],
      } satisfies IntelItem;

      return applySelectedFilterLabels(item, filters);
    });
  });
}

function uniqueSorted(items: IntelItem[], limit: number): IntelItem[] {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.ageMinutes - b.ageMinutes)
    .slice(0, limit);
}

export async function GET(request: Request) {
  const now = new Date();
  const filters = filtersFromRequest(request);
  const terms = searchTermsForFilters(filters);
  const targeted = isTargetedScan(filters);
  const sourceErrors: Record<string, string> = {};
  const tasks: Array<readonly [IntelSource, Promise<IntelItem[]>]> = [];
  if (filters.source === "All" || filters.source === "Reddit") {
    tasks.push(["Reddit", redditSignals(now, terms, filters)]);
  }
  if (filters.source === "All" || filters.source === "Hacker News") {
    tasks.push(["Hacker News", hackerNewsSignals(now, terms, filters)]);
  }
  if (filters.source === "All" || filters.source === "GitHub") {
    tasks.push(["GitHub", githubSignals(now, terms, filters)]);
  }
  const settled = await Promise.allSettled(tasks.map(([, task]) => task));
  const liveSources: string[] = [];
  const items = settled.flatMap((result, index) => {
    const source = tasks[index][0];
    if (result.status === "rejected") {
      sourceErrors[source] = result.reason instanceof Error ? result.reason.message : "Unknown source error";
      return [];
    }
    liveSources.push(source);
    return result.value;
  });

  const payload: IntelResponse = {
    generatedAt: now.toISOString(),
    windowDays: filters.windowDays,
    windowHours: filters.windowDays * 24,
    liveSources,
    redditSubreddits: redditSourceSubreddits,
    searchTerms: terms,
    scanMode: targeted ? "targeted" : "broad",
    sourceErrors,
    items: uniqueSorted(items, targeted ? (filters.windowDays > 7 ? 220 : 160) : filters.windowDays > 7 ? 120 : 80),
  };

  return NextResponse.json(payload);
}
