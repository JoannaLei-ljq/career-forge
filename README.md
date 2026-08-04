# AI Interview Toolkit

An AI-powered interview prep app with four tools in one interface:

- **Resume Analysis** — strengths, weaknesses, a role-fit score, and key areas to prepare
- **STAR Rewrite** — turns a work story into Situation / Task / Action / Result format
- **Question Prediction** — 5 likely interview questions for a target role, by category
- **Mock Interview** — a multi-turn simulated interviewer that follows up on your answers

Responses stream in token-by-token, support voice input via the browser's Web Speech
API, and render as formatted Markdown.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Vercel AI SDK](https://sdk.vercel.ai) (`ai`, `@ai-sdk/react`) for streaming chat, via the
  [OpenRouter provider](https://openrouter.ai) — model is configurable, so you can point it
  at any OpenRouter-hosted model
- [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com) components
- [lucide-react](https://lucide.dev) icons

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable             | Description                                                                 |
   | -------------------- | ---------------------------------------------------------------------------- |
   | `OPENROUTER_API_KEY` | API key from [openrouter.ai](https://openrouter.ai/keys)                     |
   | `OPENROUTER_MODEL`   | Model ID to use, e.g. `openai/gpt-4o-mini` (see [openrouter.ai/models](https://openrouter.ai/models)) |

3. Run the dev server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `app/page.tsx` — main UI: tool switcher, input panel, streaming response panel
- `app/api/chat/route.ts` — API route that streams a mode-specific system prompt + user
  input through OpenRouter
- `components/ui/` — shadcn primitives (Button, Card, Tabs, Textarea, etc.)

See [`UPGRADE_PLAN.md`](./UPGRADE_PLAN.md) for the project roadmap and what's implemented
so far.
