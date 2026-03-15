'use client';

import React from 'react';

type Props = {
  text: string;
  isStreaming?: boolean;
  charsPerFrame?: number; // base typing speed per 16ms frame
  className?: string;
};

/**
 * StreamingText
 * Smoothly reveals `text` using requestAnimationFrame.
 * IMPORTANT: Uses refs for live values inside rAF to avoid stale-closure bugs that capped output to ~first chunk.
 */
export function StreamingText({
  text,
  isStreaming = false,
  charsPerFrame = 28,
  className = '',
}: Props) {
  // React state (rendered length). We update it from a ref inside rAF.
  const [displayed, setDisplayed] = React.useState(0);

  // Refs that always hold latest values for rAF loop
  const displayedRef = React.useRef(0);
  const textRef = React.useRef(text);
  const targetRef = React.useRef(text.length);
  const streamingRef = React.useRef(isStreaming);
  const rafRef = React.useRef<number | null>(null);
  const lastTsRef = React.useRef<number | null>(null);

  // Keep refs in sync with latest props
  React.useEffect(() => {
    textRef.current = text;
    targetRef.current = text.length;
    // ensure loop is running when new text arrives
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  React.useEffect(() => {
    streamingRef.current = isStreaming;
    start();
  }, [isStreaming]);

  React.useEffect(() => {
    // initial kick
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
  };

  const start = () => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const tick = (ts: number) => {
    const last = lastTsRef.current ?? ts;
    const dt = Math.max(1, ts - last);
    lastTsRef.current = ts;

    let current = displayedRef.current;
    const target = targetRef.current;

    if (current < target) {
      // Scale speed a bit with frame delta
      const scale = Math.max(1, Math.round(dt / 16));
      let inc = charsPerFrame * scale;

      // Prefer to break on a newline if close (feels line-by-line)
      const remaining = textRef.current.slice(current, Math.min(target, current + inc + 200));
      const nl = remaining.indexOf('\n');
      if (nl >= 0 && nl < inc) inc = nl + 1;

      const next = Math.min(target, current + inc);

      if (next !== current) {
        displayedRef.current = next;
        setDisplayed(next);
        current = next;
      }
    }

    // Continue while we still have more to reveal or we expect new text to arrive
    if (displayedRef.current < targetRef.current || streamingRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      stop();
    }
  };

  const visible = React.useMemo(() => text.slice(0, displayed), [text, displayed]);

  return (
    <div
      className={className}
      aria-live="polite"
      // Browser skips offscreen paint; avoids layout thrash for long messages
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '1rem 1200px',
      } as React.CSSProperties}
    >
      {visible}
    </div>
  );
}