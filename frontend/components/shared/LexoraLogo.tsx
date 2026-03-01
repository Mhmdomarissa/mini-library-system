import { cn } from '@/lib/utils';

interface LexoraLogoProps {
  /** Height of the SVG mark in px */
  size?: number;
  /** Show the wordmark beside the mark */
  showWordmark?: boolean;
  /** Extra classes on the wrapper */
  className?: string;
  /** Font size class for the wordmark (default: text-lg) */
  textSize?: string;
}

/**
 * Lexora — brand logo.
 *
 * Mark: open book with a 4-point spark above the spine,
 *       symbolising knowledge + AI intelligence.
 *
 * Wordmark: "Lex" in foreground · "ora" in primary (indigo).
 */
export function LexoraLogo({
  size = 28,
  showWordmark = true,
  className,
  textSize = 'text-lg',
}: LexoraLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* ── SVG Mark ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left page — slightly translucent so pages feel distinct */}
        <path
          d="M18 13C14 11 8.5 11 4 13L4 29C8.5 27 14 27 18 29Z"
          className="fill-primary"
          fillOpacity="0.45"
        />
        {/* Right page */}
        <path
          d="M18 13C22 11 27.5 11 32 13L32 29C27.5 27 22 27 18 29Z"
          className="fill-primary"
        />
        {/* Spine crease */}
        <line
          x1="18" y1="13" x2="18" y2="29"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        {/* 4-point spark / star above spine — AI intelligence motif */}
        <path
          d="M18 1.5L19.1 5.2L22.8 6L19.1 6.8L18 10.5L16.9 6.8L13.2 6L16.9 5.2Z"
          className="fill-primary"
        />
      </svg>

      {/* ── Wordmark ── */}
      {showWordmark && (
        <span className={cn('font-extrabold tracking-tight leading-none', textSize)}>
          <span className="text-foreground">Lex</span>
          <span className="text-primary">ora</span>
        </span>
      )}
    </div>
  );
}
