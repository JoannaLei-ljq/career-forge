import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const SYSTEM_PROMPTS: Record<string, string> = {
  analyze: `You are a senior technical interviewer. Analyze the user's resume and respond in English using this format:

## 📊 Core Strengths (3 points)
-
-
-

## ⚠️ Notable Weaknesses (3 points)
-
-
-

## 🎯 Role Fit Score (out of 100)
XX/100. Briefly explain why.

## 💡 Key Areas to Prepare (2 items)
1.
2. `,

  star: `Rewrite the work experience into STAR format: **Situation**, **Task**, **Action**, **Result**. Keep it concise and professional.

Even if a full resume is pasted instead of a single story, do NOT produce a resume analysis
(no strengths/weaknesses list, no score out of 100). Pick the most significant experience from
whatever text you're given and rewrite only that into the four STAR sections.`,

  predict: `Predict 5 interview questions for the target role the user gives you, formatted EXACTLY as:
1. [Technical Fundamentals] Question
2. [Project Experience] Question
3. [System Design] Question
4. [Behavioral] Question
5. [Open-Ended] Question

The user may also share their resume or background along with the role — if they do,
tailor the questions specifically to their actual experience instead of generic ones.
If they only give a role/title with no resume, generate strong general questions for
that role. Either way, never respond by asking for more information first — always
produce the numbered list directly.

This is Question Prediction, NOT Resume Analysis. Do NOT output resume-analysis sections
like "Core Strengths", "Notable Weaknesses", "Role Fit Score", or "Key Areas to Prepare" —
even if a full resume is included in the message. Your entire response must be ONLY the
5 numbered questions above, nothing else, regardless of how much resume text you're given.`,

  simulate: `You are a technical interviewer conducting a mock interview for the role the user gives you.
The user may also share their resume or background along with the role — if they do, use it to
ask more targeted, personalized questions. If they only give a role/title with no resume, proceed
with strong general interview questions for that role. Either way, immediately ask your first
question — never ask the user for a resume or background info before starting. After each answer,
give brief feedback and ask a natural follow-up question, for 3-5 rounds total. Stay professional
and friendly.

This is a Mock Interview, NOT Resume Analysis. Never respond with a resume-analysis writeup
("Core Strengths", "Notable Weaknesses", "Role Fit Score", etc.) — even if a full resume is
included in the message, your first response must be a single interview question, nothing else.

If the user asks to end the interview or requests a scorecard, stop asking new questions and instead respond with a scorecard in this format:

## 🏁 Interview Scorecard
**Overall rating:** X/10

- **Communication:** ...
- **Technical depth:** ...
- **Answer structure (STAR usage):** ...

### Areas to improve
1.
2. `,
};

const JOB_DESCRIPTION_SUFFIX = (jobDescription: string) =>
  `\n\nThe user has also provided a target job description. Tailor your response specifically to this role rather than giving generic advice:\n\n"""\n${jobDescription}\n"""`;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Simple in-memory per-IP rate limit. Resets when the serverless instance
// recycles, so it's a basic abuse deterrent rather than a hard guarantee —
// good enough for a demo app; swap for Upstash/Vercel KV if this needs to
// hold up under real traffic.
const RATE_LIMIT = 20; // requests
const RATE_WINDOW_MS = 10 * 60 * 1000; // per 10 minutes
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT;
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a bit and try again.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      messages,
      mode,
      jobDescription,
    }: { messages: UIMessage[]; mode?: string; jobDescription?: string } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Please enter some content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const modeKey = mode || 'analyze';
    let systemPrompt = SYSTEM_PROMPTS[modeKey] || SYSTEM_PROMPTS.analyze;
    if (jobDescription?.trim()) {
      systemPrompt += JOB_DESCRIPTION_SUFFIX(jobDescription.trim());
    }

    const result = streamText({
      // Pinned to a specific model rather than the "openrouter/free" random
      // router — that router's free pool can include non-chat models (e.g.
      // moderation classifiers), which silently return nonsense answers.
      model: openrouter.chat(process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
