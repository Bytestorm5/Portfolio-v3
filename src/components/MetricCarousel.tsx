"use client";

import { useState, type ReactNode } from "react";

export type MetricSlide = {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  node: ReactNode;
};

/**
 * Shell for the hero metrics panel. Built to hold several metrics; with a
 * single slide the controls stay out of the way rather than rendering a
 * one-item picker.
 */
export default function MetricCarousel({
  slides,
  footer,
}: {
  slides: MetricSlide[];
  footer?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const current = slides[Math.min(index, slides.length - 1)];
  const multiple = slides.length > 1;

  if (!current) return null;

  return (
    <section
      aria-label="Live activity metrics"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {current.title}
          </h2>
          {current.subtitle && (
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {current.subtitle}
            </p>
          )}
        </div>

        {multiple && (
          <div role="tablist" aria-label="Choose a metric" className="flex gap-1">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                  i === index
                    ? "bg-white/12 text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:bg-white/5"
                }`}
              >
                {slide.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {current.node}

      {footer && (
        <div className="mt-3 border-t border-[var(--border)] pt-2.5">{footer}</div>
      )}
    </section>
  );
}
