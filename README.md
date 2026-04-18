# CMU AI Hack — VibeCheck

<img width="396" height="796" alt="image" src="https://github.com/user-attachments/assets/451a2ecb-61c1-4f99-bc78-f283e9dfd6f8" />

**VibeCheck** is a mobile-first Next.js demo: passive browser signals → **Claude** (Anthropic Messages API) → structured vibe + **Deezer** 30s previews. Product and API contracts live in [`plan.md`](./plan.md) and [`spec.md`](./spec.md).
<img width="960" height="540" alt="CMUAI" src="https://github.com/user-attachments/assets/b3636f08-ff6f-4ba5-bad1-9562222599a5" />

## Repository layout

| Path | Description |
|------|-------------|
| [`vibecheck/`](./vibecheck/) | Next.js app (UI, `/api/claude`, env) |
| `plan.md` | Agent scope, theme, checklist |
| `spec.md` | Full technical specification |

<img width="1173" height="1291" alt="image" src="https://github.com/user-attachments/assets/372d48f1-d068-4835-b84a-489cca5ed4e2" />

## Quick start

```bash
cd vibecheck
copy .env.example .env.local
```

Set `ANTHROPIC_API_KEY` in `.env.local`, then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Full judge-oriented setup, limitations, and Devpost checklist are in **[`vibecheck/README.md`](./vibecheck/README.md)**.

## Ship checklist

1. Push this repo to **GitHub** (keep `.env.local` out of git; commit `.env.example` only).
2. Add your **Google Doc** link for Claude integration narrative in `vibecheck/README.md` (replace the placeholder Doc ID).
3. Link the repo on **Devpost** and attach a demo video / deploy URL if the hackathon allows.

## License

Hackathon demo — verify team/license preferences before reuse.
