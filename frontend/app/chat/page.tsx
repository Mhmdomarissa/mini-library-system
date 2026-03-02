'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Send, User, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/components/shared';
import { useAuth } from '@/features/auth';
import { useSendMessage } from '@/features/chat';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatSource } from '@/types';

// ── Source badge / card shown under each assistant reply ─────────────────────

function SourceCard({ source }: { source: ChatSource }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5">
      <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium leading-none">{source.title}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {source.author} · {source.genre}
        </p>
      </div>
    </div>
  );
}

// ── Welcome screen shown when no messages yet ─────────────────────────────────

function WelcomeScreen({ onSelect }: { onSelect: (text: string) => void }) {
  const suggestions = [
    'Recommend a mystery novel',
    'What sci-fi books do you have?',
    "I liked The Nightingale — what's similar?",
    'Any non-fiction about history?',
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Librarian Assistant</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Ask me anything about our book catalogue — I can recommend books,
          check availability, and answer reading questions.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <Badge
            key={s}
            variant="outline"
            role="button"
            tabIndex={0}
            className="cursor-pointer rounded-full px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => onSelect(s)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s); } }}
          >
            &ldquo;{s}&rdquo;
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      {/* Bubble + optional sources */}
      <div className={cn('flex max-w-[78%] flex-col gap-2', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm bg-muted text-foreground',
          )}
        >
          {msg.content}
        </div>

        {/* Sources — only for assistant messages */}
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Related books
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {msg.sources.map((s) => (
                <SourceCard key={s.id} source={s} />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { authUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !authUser) router.replace('/login');
  }, [authUser, authLoading, router]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useSendMessage();

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMessage.isPending) return;

    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Resize textarea back to default
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const res = await sendMessage.mutateAsync(text);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.reply,
        sources: res.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      // Remove the optimistic user message on failure
      setMessages((prev) => prev.slice(0, -1));
      if (err instanceof ApiError && err.status === 429) {
        toast.error('Rate limit reached', {
          description: 'Max 10 questions per 15 minutes. Please wait and try again.',
        });
      } else {
        toast.error('Could not reach the librarian. Please try again.');
      }
    }
  };

  // Enter = send, Shift+Enter = newline
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-10rem)] flex-col">
        <PageHeader
          title="Librarian Assistant"
          description="Ask anything about our book catalogue — powered by AI."
        />

        {/* Message list */}
        <div className="flex-1 overflow-y-auto rounded-xl border bg-background p-4">
          {messages.length === 0 ? (
            <WelcomeScreen onSelect={(text) => { setInput(text); setTimeout(() => textareaRef.current?.focus(), 0); }} />
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {sendMessage.isPending && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="mt-3 flex items-end gap-2 rounded-xl border bg-background p-3">
          <Textarea
            ref={textareaRef}
            placeholder="Ask about a book, genre, or recommendation…"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            className="max-h-40 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            className="shrink-0"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
