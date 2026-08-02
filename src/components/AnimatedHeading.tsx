"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

/**
 * Reveals the heading a character at a time. Rendered in full on the server so
 * the text is present without JS; the animation only takes over on mount.
 */
export default function AnimatedHeading({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const chars = el.querySelectorAll<HTMLElement>("[data-char]");
    animate(chars, {
      opacity: { from: 0, to: 1 },
      y: { from: "0.4em", to: "0em" },
      duration: 620,
      delay: stagger(34),
      ease: "out(3)",
    });
  }, []);

  return (
    <h1 ref={ref} className={className}>
      {/* Split for the stagger; the whole string stays readable to AT. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {[...text].map((char, i) => (
          <span
            key={`${char}-${i}`}
            data-char
            className="inline-block whitespace-pre will-change-transform"
          >
            {char}
          </span>
        ))}
      </span>
    </h1>
  );
}
