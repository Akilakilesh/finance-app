"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { lockApp, signOut, useAuth } from "@/lib/auth-client";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/assets", label: "Assets" },
  { href: "/liabilities", label: "Liabilities" },
  { href: "/goals", label: "Goals" },
  { href: "/connections", label: "Connections" },
  { href: "/security", label: "Security" },
];

const actionClass =
  "rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 transition-all duration-150 select-none hover:bg-white/10 hover:text-white active:scale-[0.96]";

export function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-surface/95 text-white backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-md bg-white text-xs font-bold text-surface"
          >
            ₹
          </span>
          My Money
        </Link>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 select-none active:scale-[0.96] ${
                  active
                    ? "bg-white text-surface shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {user ? (
            <span className="mr-2 hidden max-w-[14rem] truncate text-sm text-white/50 lg:inline">
              {user.email}
            </span>
          ) : null}
          <button type="button" onClick={() => void lockApp()} className={actionClass}>
            Lock
          </button>
          <button type="button" onClick={() => void signOut()} className={actionClass}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
