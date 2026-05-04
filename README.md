# Terminal Intel

Terminal Intel is a Next.js dashboard for finding useful AI and developer-tooling news from the last 24 hours. It watches public sources for Codex, Claude, OpenAI, Anthropic, coding agents, APIs, MCP, benchmarks, security, pricing, prompts, guides, and practical tools.

The app is built for fast local triage: open it, choose a focus such as Codex or Claude, narrow by source or category, and review ranked signals with source links and short "why it matters" explanations.

## Features

- Live `/api/intel` aggregation from public Reddit JSON, Hacker News Algolia, and GitHub Search.
- Usefulness scoring based on recency, engagement, source type, and developer-impact keywords.
- Terminal-style dashboard with focus filters, news type filters, source filters, score threshold, and command-palette search.
- Targeted backend scans for selected focus/category/type combinations, so filters like `Codex + Useful Tools` fetch matching resources instead of only hiding a broad feed.
- Story analysis panel with why-it-matters text, source telemetry, watchlist context, tags, and direct links to originals.
- Graceful fallback seed data if public sources fail, rate-limit, or are temporarily unavailable.
- No secrets or paid accounts are required for the current public-source mode.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Next route handler for the aggregation API
- Vitest for unit tests
- ESLint for static checks

## Requirements

- Node.js 20 or newer is recommended.
- npm is required because the project includes `package-lock.json`.
- Internet access is needed for live Reddit, Hacker News, and GitHub aggregation.

The commands below work on Windows, macOS, and Linux. Use PowerShell, Command Prompt, Terminal, or any shell that can run `npm`.

## Setup

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd <repository-folder>
npm install
```

No environment variables are required. The included `.env.example` documents that the current public-source aggregator does not need secrets.

If future authenticated providers are added, copy `.env.example` to `.env.local` and fill only the variables documented there:

```bash
cp .env.example .env.local
```

On Windows PowerShell, the equivalent copy command is:

```powershell
Copy-Item .env.example .env.local
```

## Run Locally

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

PowerShell run-from-anywhere example for this local checkout:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath 'F:\study\projects\AINews\A'; npm run dev"
```

## API

`GET /api/intel`

Optional query parameters:

- `focus`: `Codex`, `Claude`, `OpenAI`, `Anthropic`, `Agents`, or `DevTools`
- `category`: `News`, `Projects`, `Skills`, `Useful Tools`, `Useful Tricks`, `Guides`, `Prompts`, or `Workflows`
- `type`: `Model Releases`, `API Changes`, `Coding Agents`, `Benchmarks`, `Security`, `Research`, or `Pricing`
- `source`: `Reddit`, `Hacker News`, or `GitHub`
- `q`: extra search terms

Example:

```text
/api/intel?focus=Codex&category=Useful+Tools
```

The response includes:

- `generatedAt`: server timestamp
- `windowDays` and `windowHours`: current scan window
- `liveSources`: sources that responded successfully
- `redditSubreddits`: subreddit list used by Reddit searches
- `searchTerms`: backend terms used for broad or targeted scans
- `scanMode`: `broad` or `targeted`
- `sourceErrors`: per-source failures, usually rate limits or network blocks
- `items`: normalized, ranked news items

## Useful Commands

Run the development server:

```bash
npm run dev
```

Run unit tests:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Start the production server after building:

```bash
npm run start
```

## Project Structure

```text
src/app/
  api/intel/route.ts      Live aggregation API route
  globals.css             Global Tailwind styles
  layout.tsx              App metadata and shell
  page.tsx                Main page entrypoint
src/components/
  TerminalIntelApp.tsx    Interactive dashboard UI
src/lib/
  intel.ts                Classification, scoring, filters, and shared types
  intel.test.ts           Unit tests for classification and scoring
public/                   Static public assets
```

## Deployment

This is a standard Next.js app. Any platform that supports Next.js can run it, including Vercel, a Node.js server, Docker, or a Windows/Linux/macOS machine with Node installed.

For a production host:

```bash
npm install
npm run build
npm run start
```

The API uses public network calls at request time. If a provider rate-limits or blocks a request, the app reports that in `sourceErrors` instead of silently hiding the problem.

## Verification Status

The repository is expected to pass:

```bash
npm test
npm run lint
npm run build
```
