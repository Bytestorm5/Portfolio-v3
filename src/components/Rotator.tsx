"use client";

import { useEffect, useRef, useState } from "react";
import { createTimeline } from "animejs";

/* Fixed hues rather than random ones, so the server and client agree. */
const HUES = [195, 330, 45, 265, 150];

const TYPE_MS_PER_CHAR = 42;
const ERASE_MS_PER_CHAR = 18;
const HOLD_MS = 1600;

/**
 * Typewriter rotator driven by anime.js: the timeline animates a character
 * count and the text is written straight to the DOM, so the effect runs at
 * frame rate without pushing a React render per character.
 */
export default function Rotator({ phrases }: { phrases: readonly string[] }) {
  const textRef = useRef<HTMLSpanElement>(null);
  /* Colour lives on the wrapper so the caret, which inherits currentColor,
     changes with the phrase. */
  const colorRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<{ pause: () => void; play: () => void } | null>(null);
  const [announced, setAnnounced] = useState(phrases[0] ?? "");

  useEffect(() => {
    const out = textRef.current;
    const tint = colorRef.current;
    if (!out || !tint || phrases.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      out.textContent = phrases[0];
      return;
    }

    const state = { n: 0 };
    const write = (phrase: string) => () => {
      out.textContent = phrase.slice(0, Math.round(state.n));
    };

    const timeline = createTimeline({ loop: true, defaults: { ease: "linear" } });

    phrases.forEach((phrase, i) => {
      timeline
        .add(state, {
          n: { from: 0, to: phrase.length },
          duration: phrase.length * TYPE_MS_PER_CHAR,
          onBegin: () => {
            tint.style.color = `oklch(0.7378 0.1828 ${HUES[i % HUES.length]})`;
            setAnnounced(phrase);
          },
          onUpdate: write(phrase),
        })
        .add(state, { n: phrase.length, duration: HOLD_MS })
        .add(state, {
          n: { from: phrase.length, to: 0 },
          duration: Math.max(200, phrase.length * ERASE_MS_PER_CHAR),
          onUpdate: write(phrase),
        });
    });

    timelineRef.current = timeline;
    return () => {
      timeline.pause();
      timelineRef.current = null;
    };
  }, [phrases]);

  const pause = () => timelineRef.current?.pause();
  const resume = () => timelineRef.current?.play();

  /* An invisible sizer holds the width of the longest phrase so the paragraph
     never reflows as characters are typed and deleted. */
  const longest = phrases.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span
      className="relative inline-block align-bottom"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <span aria-hidden className="invisible whitespace-nowrap">
        {longest}
      </span>
      {/* Text and caret share one line box, so the caret trails the last
          typed character without any position bookkeeping. */}
      <span
        ref={colorRef}
        aria-hidden
        className="absolute left-0 top-0 whitespace-nowrap"
        style={{ color: `oklch(0.7378 0.1828 ${HUES[0]})` }}
      >
        <span ref={textRef}>{phrases[0]}</span>
        <span className="typing-caret" />
      </span>
      {/* Announce whole phrases, not individual keystrokes. */}
      <span className="sr-only" aria-live="polite">
        {announced}
      </span>
    </span>
  );
}
