'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BookMarked,
  Bot,
  CheckCircle2,
  Github,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Book3D } from '@/components/rareui/Book3D';
import { useAuth } from '@/features/auth';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.86 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: 0.2 },
  },
};

const FEATURES = [
  {
    icon: BookMarked,
    color: 'bg-primary/10 text-primary',
    title: 'Smart Borrowing',
    description: 'Due dates, per-member limits, and real-time availability — borrowing that just works.',
  },
  {
    icon: Sparkles,
    color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    title: 'AI Semantic Search',
    description: 'Search by meaning, not just words — describe what you want and find the perfect book instantly.',
  },
  {
    icon: Bot,
    color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    title: 'Librarian Chatbot',
    description: 'Your personal AI librarian knows your reading history — ask anything and get tailored recommendations.',
  },
  {
    icon: Zap,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    title: 'Automatic Fines',
    description: 'Overdue books are tracked automatically and fines are calculated instantly when you return them.',
  },
  {
    icon: ShieldCheck,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    title: 'Role-Based Access',
    description: 'Members, librarians, and admins each get their own tailored view and permissions.',
  },
  {
    icon: CheckCircle2,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    title: 'Reliable & Secure',
    description: 'Every borrow and return is safe and consistent — your data is always accurate and protected.',
  },
] as const;

export default function LandingPage() {
  const { authUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authUser) router.replace('/dashboard');
  }, [authUser, loading, router]);

  if (loading || authUser) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-xl md:px-10">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <BookOpen className="h-5 w-5 text-primary" />
          <span>Mini Library</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">
              Get started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-14">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background" />
          <div className="absolute right-0 top-0 h-[700px] w-[700px] -translate-y-1/4 translate-x-1/4 rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] translate-y-1/3 -translate-x-1/4 rounded-full bg-violet-400/5 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>

        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 md:grid-cols-2 md:px-10 lg:gap-16">
          {/* Left text */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="secondary" className="w-fit gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3 w-3 text-primary" />
                AI-powered library management
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={0.05}
              className="text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              The library system
              <br />
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                built for today.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={0.1}
              className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Borrow, search, and manage books with AI-powered recommendations, semantic search,
              and a RAG librarian chatbot — all in one clean interface.
            </motion.p>

            <motion.div variants={fadeUp} custom={0.15} className="flex flex-wrap gap-3">
              <Button size="lg" asChild className="gap-2 shadow-lg shadow-primary/20">
                <Link href="/signup">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </motion.div>

            <motion.ul
              variants={fadeUp}
              custom={0.2}
              className="flex flex-col gap-1.5 text-sm text-muted-foreground"
            >
              {['No credit card required', 'Secure sign-in included', 'Dark mode included'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Right Book3D */}
          <motion.div
            variants={fadeScale}
            initial="hidden"
            animate="show"
            className="flex items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/8 blur-[70px]" />
              <Book3D />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-y bg-muted/30"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border px-6 py-8 sm:grid-cols-4 md:px-10">
          {[
            { value: '∞', label: 'Books in catalogue' },
            { value: 'AI', label: 'Smart search & chat' },
            { value: '100%', label: 'Reliable borrows' },
            { value: '3', label: 'Member · Staff · Admin' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-4 py-2 text-center">
              <span className="text-2xl font-extrabold text-primary">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything a modern library needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            From borrowing books to AI-powered recommendations — everything in one clean place.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map(({ icon: Icon, color, title, description }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { duration: 0.18 } }}
              className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA banner ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-y bg-primary/5"
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-20 text-center md:px-10">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to explore the library?
          </h2>
          <p className="max-w-md text-muted-foreground">
            Sign up in seconds, browse the catalogue, borrow by the book, and ask the AI librarian anything.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild className="gap-2 shadow-md shadow-primary/20">
              <Link href="/signup">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Already have an account</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row md:px-10">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Mini Library</span>
            <span>· All rights reserved © 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition-colors hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="transition-colors hover:text-foreground">Sign up</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
