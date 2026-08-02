import { profile } from "@/data/profile";

export default function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-5xl px-4 pb-10">
      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <a href={`mailto:${profile.links.email}`}>{profile.links.email}</a>
          <a href={profile.links.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={profile.links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={profile.links.blog} target="_blank" rel="noreferrer">
            Blog
          </a>
        </div>
      </div>
    </footer>
  );
}
