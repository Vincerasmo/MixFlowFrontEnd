import { Link, useLocation, useNavigate } from "react-router-dom";
import { type ReactNode } from "react";
import { PickleballIcon } from "../components/icons/pickleball-icons";
import { getStoredOrganizer, logout } from "@/services/auth";

const NAV: { label: string; to: string }[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Sessions", to: "/sessions" },
  { label: "Players", to: "/players" },
  { label: "Queue", to: "/queue" },
  { label: "Matches", to: "/matches" },
  { label: "Leaderboard", to: "/leaderboard" },
];

// "Jeevon Ricafort" -> "JR". Falls back gracefully for single-word or missing names.
function getInitials(fullName: string | undefined): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const organizer = getStoredOrganizer();
  const initials = getInitials(organizer?.fullName);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 lg:gap-8">
            <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
              <PickleballIcon className="size-8" />
              <span className="text-base font-bold tracking-tight">
                MixFlow<span className="text-brand-dark">.</span>
              </span>
            </Link>
            <div className="hidden min-w-0 gap-1 md:flex">
              {NAV.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-ink text-white"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="rounded-full bg-zinc-100 p-1 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900">
              <span className="sr-only">Logout</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                />
              </svg>
            </button>
            <div
              title={organizer?.fullName}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-ball to-brand text-[11px] font-bold text-zinc-900 ring-2 ring-white shadow-sm"
            >
              {initials}
            </div>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  active ? "bg-ink text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-dark">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[20px] bg-white p-5 ring-1 ring-black/5 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}