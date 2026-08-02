import Link from "next/link";
import Image from "next/image";
import Card from "@/components/Card";
import Rotator from "@/components/Rotator";
import AnimatedHeading from "@/components/AnimatedHeading";
import HeroMetrics from "@/components/HeroMetrics";
import { profile } from "@/data/profile";
import { experience } from "@/data/experience";
import { featured } from "@/data/projects";

/* Re-read the metrics snapshot hourly rather than pinning it at build time. */
export const revalidate = 3600;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 py-10 sm:gap-20 sm:py-14">
      {/* ---- Hero: pitch on the left, live metrics on the right --------- */}
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
        <div>
          <AnimatedHeading
            text="Kamil Arif."
            className="text-4xl font-bold tracking-tight sm:text-6xl"
          />
          <p className="mt-3 text-lg text-[var(--text-secondary)] sm:text-xl">
            Need <Rotator phrases={profile.taglines} />
          </p>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
            {profile.summary}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={profile.links.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[#062023] no-underline transition-opacity hover:opacity-90"
            >
              Get in touch
            </a>
            <Link
              href="/projects"
              className="rounded-lg border border-[var(--border)] bg-white/5 px-5 py-2 text-sm font-semibold text-[var(--text-primary)] no-underline transition-colors hover:bg-white/10"
            >
              See my work
            </Link>
            <a
              href={profile.links.github}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--border)] px-5 py-2 text-sm text-[var(--text-secondary)] no-underline transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              GitHub ↗
            </a>
          </div>
        </div>

        <HeroMetrics />
      </section>

      {/* ---- Experience ------------------------------------------------ */}
      <section aria-labelledby="experience-heading">
        <h2 id="experience-heading" className="text-xl font-semibold sm:text-2xl">
          Experience
        </h2>
        <div className="mt-5 flex flex-col gap-4">
          {experience.map((role, i) => (
            <Card key={`${role.org}-${role.title}`} tint={role.tint} delayIndex={i}>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <h3 className="flex items-center gap-2 text-base font-bold">
                  {role.icon && (
                    <Image
                      src={role.icon}
                      alt=""
                      width={18}
                      height={18}
                      className="h-[1em] w-[1em] object-contain"
                    />
                  )}
                  {role.org} — {role.title}
                </h3>
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  <time dateTime={role.startISO}>{role.start}</time>
                  {" — "}
                  {role.endISO ? <time dateTime={role.endISO}>{role.end}</time> : role.end}
                </p>
              </div>
              {role.team && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">{role.team}</p>
              )}
              <ul className="mt-3 flex list-none flex-col gap-2 p-0 text-sm leading-relaxed text-[var(--text-secondary)]">
                {role.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden className="text-[var(--accent-dim)]">
                      ▸
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- Selected work --------------------------------------------- */}
      <section aria-labelledby="work-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="work-heading" className="text-xl font-semibold sm:text-2xl">
            Selected work
          </h2>
          <Link href="/projects" className="text-sm underline underline-offset-4">
            All projects →
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {featured.slice(0, 3).map((project, i) => (
            <Card key={project.name} tint={project.tint} delayIndex={i}>
              <h3 className="text-sm font-bold">{project.name}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {project.blurb}
              </p>
              <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0">
                {project.tags.slice(0, 3).map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
