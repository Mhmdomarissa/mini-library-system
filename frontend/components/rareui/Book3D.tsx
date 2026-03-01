'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Book3DProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Book3D — interactive CSS 3D book.
 *
 * Idle: gentle oscillating rock animation.
 * Hover: mouse-tracking tilt that follows the cursor.
 */
export function Book3D({
  title = 'Mini\nLibrary',
  subtitle = 'Your Digital Collection',
  className,
}: Book3DProps) {
  const [rot, setRot] = useState({ x: -8, y: 25 });
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const frameRef = useRef<number>(0);

  // Idle oscillation
  useEffect(() => {
    if (hovered) {
      cancelAnimationFrame(frameRef.current);
      return;
    }
    const animate = () => {
      angleRef.current += 0.35;
      const y = Math.sin((angleRef.current * Math.PI) / 180) * 11 + 22;
      const x = Math.cos((angleRef.current * Math.PI) / 360) * -3 - 7;
      setRot({ x, y });
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [hovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setRot({ x: ny * -22, y: nx * 32 + 16 });
  };

  const W = 160;
  const H = 220;
  const D = 42;

  return (
    <div
      ref={containerRef}
      className={cn('relative select-none cursor-pointer', className)}
      style={{ perspective: '900px', width: W + D + 80, height: H + 80 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {/* Book wrapper */}
      <div
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: hovered ? 'transform 0.08s linear' : 'transform 0.65s ease-out',
          width: W,
          height: H,
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginTop: -(H / 2),
          marginLeft: -(W / 2 + D / 4),
        }}
      >
        {/* ── Front cover ── */}
        <div
          style={{
            position: 'absolute',
            width: W,
            height: H,
            background: 'linear-gradient(148deg, #6366f1 0%, #4f46e5 45%, #3730a3 100%)',
            transform: `translateZ(${D / 2}px)`,
            borderRadius: '2px 6px 6px 2px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 20px',
            color: 'white',
            boxShadow: '6px 6px 32px rgba(79,70,229,0.35), 0 1px 0 rgba(255,255,255,0.1) inset',
          }}
        >
          {/* Top rule */}
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          {/* Bottom rule */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          {/* Corner accent */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: 64, height: 64, background: 'rgba(255,255,255,0.06)', clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />

          {/* Book icon */}
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="9" y1="7" x2="15" y2="7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="9" y1="10" x2="13" y2="10" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>

          {/* Title */}
          <div style={{ fontSize: 17, fontWeight: 800, textAlign: 'center', lineHeight: 1.2, letterSpacing: '-0.01em', textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
            {title.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: 9, fontWeight: 600, marginTop: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center' }}>
            {subtitle}
          </div>

          {/* Shimmer */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.07) 50%, transparent 75%)', pointerEvents: 'none' }} />
        </div>

        {/* ── Spine ── */}
        <div
          style={{
            position: 'absolute',
            width: D,
            height: H,
            background: 'linear-gradient(180deg, #312e81 0%, #3730a3 40%, #4338ca 60%, #3730a3 100%)',
            transform: `rotateY(-90deg) translateZ(${W / 2}px)`,
            transformOrigin: 'right center',
            borderRadius: '6px 0 0 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            Lexora
          </div>
        </div>

        {/* ── Pages (right face) ── */}
        <div
          style={{
            position: 'absolute',
            width: D,
            height: H,
            background: 'repeating-linear-gradient(90deg, #e9e3d9 0px, #f3ede6 1.5px, #f3ede6 3px, #e9e3d9 4.5px)',
            transform: `rotateY(90deg) translateZ(${W / 2}px)`,
            transformOrigin: 'left center',
          }}
        />

        {/* ── Back cover ── */}
        <div
          style={{
            position: 'absolute',
            width: W,
            height: H,
            background: '#312e81',
            transform: `rotateY(180deg) translateZ(${D / 2}px)`,
            borderRadius: '6px 2px 2px 6px',
          }}
        />

        {/* ── Top edge ── */}
        <div
          style={{
            position: 'absolute',
            width: W,
            height: D,
            background: 'linear-gradient(90deg, #3730a3 0%, #4f46e5 100%)',
            transform: `rotateX(90deg) translateZ(${H / 2}px)`,
            transformOrigin: 'bottom center',
          }}
        />

        {/* ── Bottom edge ── */}
        <div
          style={{
            position: 'absolute',
            width: W,
            height: D,
            background: 'linear-gradient(90deg, #3730a3 0%, #4f46e5 100%)',
            transform: `rotateX(-90deg) translateZ(${H / 2}px)`,
            transformOrigin: 'top center',
          }}
        />
      </div>

      {/* Cast shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 110,
          height: 20,
          background: 'radial-gradient(ellipse, rgba(79,70,229,0.22) 0%, transparent 72%)',
          filter: 'blur(10px)',
        }}
      />
    </div>
  );
}
