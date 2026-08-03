# Interview Toolkit — Upgrade Plan

Working name: **AI Interview Toolkit** (currently 面试百宝箱). Plan for turning the current prototype into a portfolio-ready product.

## What already exists

- Four AI-assisted tools behind a tab switcher, all sharing one chat-style layout:
  - Resume Analysis — strengths/weaknesses/fit score/prep priorities
  - STAR Rewrite — turns a work story into Situation/Task/Action/Result
  - Question Prediction — 5 likely interview questions by category
  - Mock Interview — multi-turn simulated interviewer
- Voice input via the browser's Web Speech API
- Markdown rendering of AI replies (react-markdown + remark-gfm)
- Loading state, error banner, clear-chat button, basic dark mode
- Backend: one Next.js API route with a mode-specific system prompt per tool, calling OpenRouter (model configurable via env var)
- Tech already installed but not yet wired up: Vercel AI SDK (`ai`, `@ai-sdk/*`), Drizzle ORM + `pg`, tRPC + React Query, shadcn/ui primitives (Button, Card, Input, ScrollArea)

In short: the product logic is real and complete, but the implementation is a fast prototype — blocking (non-streaming) responses, no persistence, no design system, all-Chinese UI.

## Upgrade roadmap

**Phase 1 — English localization ✅ done**
Translate all UI copy, system prompts, error messages, and page metadata to English. No structural changes.

**Phase 2 — Streaming responses (this pass)**
Replace the blocking `fetch` in the API route with the already-installed AI SDK:
- `app/api/chat/route.ts`: swap the raw OpenRouter `fetch` for `createOpenRouter` (`@openrouter/ai-sdk-provider`) + `streamText` + `convertToModelMessages`, returning `toUIMessageStreamResponse()`. Same `SYSTEM_PROMPTS` map, same mode lookup.
- `app/page.tsx`: swap the hand-rolled `messages`/`isLoading`/`fetch` state for `useChat` (`@ai-sdk/react`) backed by a `DefaultChatTransport` (`body: { mode }`, recreated per mode). Note: this SDK version (`ai@6`/`@ai-sdk/react@3`) doesn't expose `input`/`handleSubmit` from the hook — input stays local state, sending is `sendMessage({ text })`, and messages are `UIMessage[]` with a `parts` array rather than a plain `content` string.

**Phase 3 — Real design system (this pass)**
Swap the raw Tailwind divs for the already-scaffolded shadcn components, add a proper header/hero suited to a portfolio case study, and confirm mobile responsiveness:
- Add the missing shadcn theme tokens to `app/globals.css` (`--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, etc., light + dark) — the existing Button/Card/Input/ScrollArea components already reference these but they were never defined.
- Install `textarea`, `tabs`, `badge` via the shadcn CLI (not yet scaffolded).
- Rebuild `app/page.tsx`: compact hero, `Tabs` for the tool switcher with lucide-react icons instead of emoji, `Card`-based panels, shadcn `Textarea`, `Button`s (with `Send`/`Mic`/`Trash2`/`Loader2` icons), `ScrollArea` for AI responses, a status `Badge`/dot driven by `useChat`'s `status`.

**Phase 4 — Resume file upload**
Accept PDF/DOCX upload in addition to paste, with text extraction, for the Resume Analysis and STAR tools.

**Phase 5 — Persistence + accounts** *(deferred per your call — later, not this pass)*
Wire up the already-installed Drizzle + Postgres to save sessions/history, add lightweight auth (e.g. NextAuth/Clerk) so users can return to past results.

**Phase 6 — Production polish**
Error boundaries, API rate limiting (protects your OpenRouter key from abuse once public), basic tests, analytics, custom domain, deployment on Vercel.

## What "done" looks like

A single-page English-language app ("AI Interview Toolkit") with a short hero/intro suited to a portfolio, four clearly branded tools using a consistent shadcn-based design, streaming AI responses, resume file upload, and (in a later pass) saved history behind a lightweight login — deployed at a custom URL you can link from your site and describe as a case study (problem, stack, what you built, what you'd do next).

## This pass

Implementing Phase 2 (streaming) and Phase 3 (design system + visual refresh). Phases 4–6 stay as a roadmap for follow-up passes.
