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

  star: `Rewrite the work experience into STAR format: **Situation**, **Task**, **Action**, **Result**. Keep it concise and professional.`,

  predict: `Predict 5 interview questions for the given role, formatted as:
1. [Technical Fundamentals] Question
2. [Project Experience] Question
3. [System Design] Question
4. [Behavioral] Question
5. [Open-Ended] Question`,

  simulate: `You are a technical interviewer. Ask the first question, then give feedback and follow-up questions based on the user's answers, for 3-5 rounds total. Stay professional and friendly.`,
};

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, mode }: { messages: UIMessage[]; mode?: string } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Please enter some content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const modeKey = mode || 'analyze';
    const systemPrompt = SYSTEM_PROMPTS[modeKey] || SYSTEM_PROMPTS.analyze;

    const result = streamText({
      model: openrouter.chat(process.env.OPENROUTER_MODEL || 'openrouter/free'),
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
