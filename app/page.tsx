'use client';
import { useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertCircle,
  FileText,
  Flag,
  Flame,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Star,
  Target,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Mode = 'analyze' | 'star' | 'predict' | 'simulate';

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

const TOOLS: { id: Mode; label: string; desc: string; icon: typeof FileText }[] = [
  { id: 'analyze', label: 'Resume Analysis', desc: 'Strengths & weaknesses', icon: FileText },
  { id: 'star', label: 'STAR Rewrite', desc: 'Rewrite experience', icon: Star },
  { id: 'predict', label: 'Question Prediction', desc: 'Role-specific questions', icon: Target },
  { id: 'simulate', label: 'Mock Interview', desc: 'AI interviewer', icon: Users },
];

const PLACEHOLDERS: Record<Mode, string> = {
  analyze: 'Paste your full resume, or upload a file below...',
  star: 'Paste a work experience story, or upload a resume below...',
  predict: 'Enter target role, e.g. Frontend Engineer',
  simulate: 'Enter the role you want to mock interview for...',
};

// Uploading a resume file only makes sense where the input is resume/experience
// text, not a one-line role title.
const UPLOAD_MODES: Mode[] = ['analyze', 'star'];

export default function Home() {
  const [mode, setMode] = useState<Mode>('analyze');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [showJobDescription, setShowJobDescription] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: { mode, jobDescription } }),
    [mode, jobDescription]
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
    setUploadError(null);
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

    // @ts-expect-error - SpeechRecognition is not yet in the standard DOM lib types
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setInputText(finalTranscript);

      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = setTimeout(() => recognition.stop(), 3000);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    setUploadError(null);

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File is too large (max 5MB).');
      return;
    }

    const name = file.name.toLowerCase();

    if (name.endsWith('.txt')) {
      setInputText(await file.text());
      return;
    }

    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setUploadError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/extract', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to extract text from file');
      setInputText(data.text);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to extract text from file');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary" />

      <header className="relative overflow-hidden border-b bg-gradient-to-b from-primary/[0.06] to-background">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Flame className="size-6" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Career Forge
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Resume feedback, STAR rewrites, predicted questions, and mock interviews — powered by
            AI, tailored to the job you want.
          </p>
          <Badge variant="secondary" className="mt-5">
            <Sparkles className="size-3" />
            Streamed AI responses
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-4">
        <Tabs
          value={mode}
          onValueChange={(value) => switchMode(value as Mode)}
          className="mb-6"
        >
          <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-muted p-1 sm:w-fit">
            {TOOLS.map((tool) => (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                title={tool.desc}
                className="font-heading gap-1.5 px-3 py-1.5 font-medium"
              >
                <tool.icon className="size-4" />
                {tool.label}
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
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2 text-base">
                <activeTool.icon className="size-4 text-primary" />
                {activeTool.label} — Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowJobDescription((v) => !v)}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {showJobDescription ? 'Hide job description' : '+ Add job description (optional)'}
                  </button>
                  {showJobDescription && (
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description to tailor feedback to this specific role..."
                      rows={4}
                      className="mt-2 max-h-[200px] overflow-y-auto text-sm"
                      disabled={isLoading}
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={PLACEHOLDERS[mode]}
                    rows={12}
                    className="min-h-[280px] max-h-[500px] overflow-y-auto font-mono text-sm"
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
                {UPLOAD_MODES.includes(mode) && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExtracting || isLoading}
                      className="w-full"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Reading file...
                        </>
                      ) : (
                        <>
                          <Upload className="size-3.5" />
                          Upload resume (PDF/DOCX/TXT)
                        </>
                      )}
                    </Button>
                    {uploadError && (
                      <p className="mt-1.5 text-xs text-destructive">{uploadError}</p>
                    )}
                  </div>
                )}
                {mode === 'simulate' && messages.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => sendMessage({ text: 'Please end the interview now and give me my scorecard.' })}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Flag className="size-3.5" />
                    End interview & get scorecard
                  </Button>
                )}
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

          <Card className="flex flex-col shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2 text-base">
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

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>Built by Joanna</p>
          <a
            href="https://github.com/JoannaLei-ljq/career-forge"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            View source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
