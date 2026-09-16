import Link from "next/link";
import { appNav } from "@/lib/nav";

type SiteShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
};

export function SiteShell({ children, title, subtitle }: SiteShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(245,200,76,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(49,72,107,0.12),transparent_24%),linear-gradient(180deg,#f8f6ef_0%,#f4efe4_45%,#f8f6ef_100%)] text-ink-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-ink-900/10 bg-white/75 px-5 py-4 shadow-soft backdrop-blur md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium tracking-[0.24em] text-ink-700 uppercase">
                Student attendance system
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700 sm:text-base">
                {subtitle}
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {appNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-ink-900/10 bg-white px-4 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-900/20 hover:bg-amber-50"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 py-5 md:py-6">{children}</main>
      </div>
    </div>
  );
}
