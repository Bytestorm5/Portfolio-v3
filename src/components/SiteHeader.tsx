"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { profile } from "@/data/profile";

const internal = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
];

const external = [
  { href: profile.links.github, label: "GitHub" },
  { href: profile.links.linkedin, label: "LinkedIn" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="mx-auto w-full max-w-5xl px-4 pt-6">
      <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
        {internal.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-4 py-1.5 text-sm no-underline transition-colors ${
                active
                  ? "bg-white/15 text-[var(--text-primary)]"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        <span aria-hidden className="mx-1 h-4 w-px bg-[var(--border)]" />

        {external.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-4 py-1.5 text-sm text-[var(--text-secondary)] no-underline transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
          >
            {item.label}
            <span aria-hidden className="ml-1 text-[10px] opacity-60">
              ↗
            </span>
          </a>
        ))}
      </nav>
    </header>
  );
}
