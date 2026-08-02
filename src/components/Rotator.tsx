"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 2200;
/* Fixed hues rather than v2's random ones, so the server and client agree. */
const HUES = [195, 330, 45, 265, 150];

export default function Rotator({ phrases }: { phrases: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || phrases.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % phrases.length), DURATION_MS);
    return () => clearInterval(id);
  }, [paused, phrases.length]);

  return (
    <span
      className="inline-grid overflow-hidden align-bottom"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Every phrase is stacked in one grid cell so the box never resizes. */}
      {phrases.map((phrase, i) => (
        <span
          key={phrase}
          aria-hidden={i !== index}
          className="col-start-1 row-start-1 whitespace-nowrap transition-[opacity,transform] duration-500 motion-reduce:transition-none"
          style={{
            color: `oklch(0.7378 0.1828 ${HUES[i % HUES.length]})`,
            opacity: i === index ? 1 : 0,
            transform: i === index ? "translateY(0)" : "translateY(0.6em)",
          }}
        >
          {phrase}
        </span>
      ))}
      {/* Announce changes once, politely, rather than per-phrase. */}
      <span className="sr-only" aria-live="polite">
        {phrases[index]}
      </span>
    </span>
  );
}
