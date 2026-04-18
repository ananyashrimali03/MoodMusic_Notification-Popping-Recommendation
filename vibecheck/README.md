# VibeCheck (demo build)

Demo web app: **browser signals → Claude (`InferenceResult`) → Deezer 30s previews**.  
Specs live in **[`../plan.md`](../plan.md)** and **[`../spec.md`](../spec.md)**.

## Prize eligibility & Devpost submission

Requirements from the organizers (summarized):

| Requirement | Notes |
|-------------|--------|
| **Use Claude** | **Required.** This build uses the **Anthropic Messages API** server-side ([`app/api/claude/route.ts`](./app/api/claude/route.ts)): passive `SignalsPacket` in → structured `InferenceResult` JSON out. Stronger narrative for judges lives in the **[Claude integration Google Doc](#claude-integration-evaluation)** below (screenshots + prompting = better “Claude integration” scoring). |
| **GitHub repo + Devpost** | **Required for prizes.** Push this codebase to a **GitHub repository** (public is easiest for judges). Create or update your **Devpost** hackathon submission and include the **repo URL** there, plus whatever else the hackathon asks for (demo video, live URL, team, etc.). |

**Pre-submit checklist**

- [ ] Code is on **GitHub** with this `README.md` (update the Google Doc link in [Claude integration](#claude-integration-evaluation)).
- [ ] **`.env.local` / API keys are not committed** (use `.env.example` only in repo).
- [ ] **Devpost** project submitted with **GitHub repository link** filled in.
- [ ] Optional but strong: deployed demo URL (e.g. Vercel) linked on Devpost if the hackathon allows it.

## Claude integration (evaluation)

**Walkthrough Google Doc (global view — screenshots & narrative):**  
**[→ VibeCheck — Claude in this build (Google Doc)](https://docs.google.com/document/d/REPLACE_WITH_YOUR_DOCUMENT_ID/edit?usp=sharing)**

Before you submit, replace `REPLACE_WITH_YOUR_DOCUMENT_ID` in the URL above with your real Doc ID (share **Anyone with the link can view** or **Comment** for judges).  
Suggested contents for that doc:

| Topic | What to screenshot / explain |
|-------|-------------------------------|
| **Anthropic Messages API** | Env var `ANTHROPIC_API_KEY` (never in client bundle); server route [`app/api/claude/route.ts`](./app/api/claude/route.ts); model id (default Haiku); request/response shape. |
| **Creative prompting** | Full **system prompt** in the route; why JSON-only `InferenceResult`; safety / non-clinical framing; how `SignalsPacket` JSON is passed as user content. |
| **Structured output** | Example model JSON: `mood_label`, `deezer_search_query`, `playlist_vibe`, `creative_nudge`, etc.; [`lib/json.ts`](./lib/json.ts) extraction if the model wraps text. |
| **Claude Code / Cursor** *(if used)* | 1–2 screenshots of agent chat or prompts used to scaffold this repo; what you asked vs what shipped. |

**Short summary for skimmers:** Claude receives a passive **`SignalsPacket`** (time, locale, weather, device hints, empty listening stub) and returns a single **`InferenceResult`** used to (1) drive copy on screen and (2) fill **`deezer_search_query`** for real Deezer preview search — so the LLM is doing **interpretation + creative packaging**, not acting as a generic chatbot.

## Setup (about 2 minutes)

```bash
cd vibecheck
copy .env.example .env.local   # Windows — or cp on macOS/Linux
```

Edit `.env.local` and set:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

(Optional) `ANTHROPIC_MODEL` — defaults to `claude-3-5-haiku-20241022`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo limitations (intentional)

- One-hour scope: **no** Spotify OAuth, **no** listening-history FIFO yet (stub empty).
- Requires **Allow location** for weather (Open-Meteo); otherwise inference still runs with noted limitations.
- Deezer previews depend on Deezer catalog + CORS from your browser (usually OK).
- **Not** a clinical or mental-health tool.

## Pitch line

> When AI handles routine work, what’s left is inner life. VibeCheck doesn’t ask how you feel—it reads *context*, then opens a playable doorway.
