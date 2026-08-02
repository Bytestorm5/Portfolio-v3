"use client";

import { useMemo, useState } from "react";
import Card from "./Card";
import { featured, projectKinds } from "@/data/projects";

export default function ProjectGrid() {
  const [kind, setKind] = useState<(typeof projectKinds)[number]>("All");

  const shown = useMemo(
    () => (kind === "All" ? featured : featured.filter((p) => p.kind === kind)),
    [kind],
  );

  return (
    <>
      {/* Filters sit in one row above the content they scope. */}
      <div role="group" aria-label="Filter projects by kind" className="flex flex-wrap gap-2">
        {projectKinds.map((option) => {
          const active = option === kind;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              aria-pressed={active}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
            >
              {option}
              {option !== "All" && (
                <span className="ml-1.5 text-[var(--text-muted)]">
                  {featured.filter((p) => p.kind === option).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="mt-3 text-xs text-[var(--text-muted)]">
        Showing {shown.length} of {featured.length} projects
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {shown.map((project, i) => (
          <Card key={project.name} tint={project.tint} delayIndex={i}>
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <h3 className="text-base font-bold">{project.name}</h3>
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                {project.start} — {project.end}
              </p>
            </div>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">{project.blurb}</p>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
              {project.detail}
            </p>

            <ul className="mt-4 flex list-none flex-wrap gap-1.5 p-0">
              {project.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-[var(--border)] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                >
                  {tag}
                </li>
              ))}
            </ul>

            {project.links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {project.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
