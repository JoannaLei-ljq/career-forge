'use client';
import { useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertCircle,
  FileText,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Star,
  Target,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Mode = 'analyze' | 'star' | 'predict' | 'simulate';

const TOOLS: { id: Mode; label: string; desc: string; icon: typeof FileText }[] = [
  { id: 'analyze', label: 'Resume Analysis', desc: 'Strengths & weaknesses', icon: FileText },
  { id: 'star', label: 'STAR Rewrite', desc: 'Rewrite experience', icon: Star },
  { id: 'predict', label: 'Question Prediction', desc: 'Role-specific questions', icon: Target },
  { id: 'simulate', label: 'Mock Interview', desc: 'AI interviewer', icon: Mic },
];

const PLACEHOLDERS: Record<Mode, string> = {
  analyze: 'Paste your full resume...',
  star: 'Paste a work experience story...',
  predict: 'Enter target role, e.g. Frontend Engineer',
  simulate: 'Enter the role you want to mock interview for...',
};

export default function Home() {
  const [mode, setMode] = useState<Mode>('analyze');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: { mode } }),
    [mode]
  );

  const { messages, sendMessage, status, error, setMessages, clearError } = useChat({
    transport,
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const activeTool = TOOLS.find((t) => t.id === mode)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    sendMessage({ text: inputText.trim() });
    setInputText('');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessages([]);
    clearError();
  };

  const clearChat = () => {
    setMessages([]);
    clearError();
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Your browser does not support voice input. Please use Chrome, Edge, or Safari.');
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setInputText(finalTranscript);

      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = setTimeout(() => recognition.stop(), 3000);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setIsListening(false);
      if (event.error !== 'no-speech') {
        alert('Voice recognition failed. Please try again.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-4 py-10 text-center">
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="size-3" />
            AI-powered
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Interview Toolkit</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Resume feedback, STAR rewrites, predicted questions, and mock interviews — powered by AI.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-4">
        <Tabs
          value={mode}
          onValueChange={(value) => switchMode(value as Mode)}
          className="mb-6"
        >
          <TabsList className="grid h-auto grid-cols-2 gap-1 bg-muted p-1 sm:flex sm:w-fit sm:flex-wrap">
            {TOOLS.map((tool) => (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="h-auto flex-col items-start gap-0 px-3 py-2 text-left"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <tool.icon className="size-4" />
                  {tool.label}
                </span>
                <span className="text-xs font-normal text-muted-foreground">{tool.desc}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error.message}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <activeTool.icon className="size-4 text-primary" />
                {activeTool.label} — Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={PLACEHOLDERS[mode]}
                    rows={12}
                    className="min-h-[280px] font-mono text-sm"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant={isListening ? 'default' : 'outline'}
                    size="icon"
                    onClick={startListening}
                    disabled={isListening || isLoading}
                    title="Voice input"
                    className="self-start"
                  >
                    <Mic className="size-4" />
                  </Button>
                </div>
                <Button type="submit" disabled={isLoading || !inputText.trim()} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      AI thinking...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Start Analysis
                    </>
                  )}
                </Button>
                {messages.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearChat}
                    className="w-full text-muted-foreground"
                  >
                    <Trash2 className="size-3.5" />
                    Clear chat
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${
                    isLoading ? 'animate-pulse bg-yellow-500' : 'bg-green-500'
                  }`}
                />
                {activeTool.label} — AI Response
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="h-[500px] pr-3">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Sparkles className="mb-2 size-8 opacity-50" />
                    <p className="text-sm">AI responses will appear here after you submit</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const text = msg.parts
                        .filter((p) => p.type === 'text')
                        .map((p) => p.text)
                        .join('');
                      return (
                        <div
                          key={msg.id}
                          className={`rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'ml-4 bg-accent'
                              : 'mr-4 border-l-4 border-primary bg-muted/50'
                          }`}
                        >
                          <div className="mb-1 text-sm font-bold">
                            {msg.role === 'user' ? 'You' : 'AI'}
                          </div>
                          {msg.role === 'user' ? (
                            <div className="whitespace-pre-wrap text-sm">{text}</div>
                          ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {status === 'submitted' && (
                      <div className="mr-4 rounded-lg border-l-4 border-yellow-500 bg-muted/50 p-3">
                        <div className="mb-1 text-sm font-bold">AI</div>
                        <div className="flex gap-1">
                          <span className="animate-pulse">●</span>
                          <span className="animate-pulse delay-100">●</span>
                          <span className="animate-pulse delay-200">●</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
