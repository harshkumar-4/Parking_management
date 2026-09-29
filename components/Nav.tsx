"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const TABS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/entry",
    label: "New Entry",
    highlight: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/exit",
    label: "Vehicle Exit",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/rates",
    label: "Rates",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: "/passes",
    label: "Passes",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
];


export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = supabaseBrowser();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-asphalt sticky top-0 z-20 shadow-[0_2px_0_0_#F5A623]">
      <div className="max-w-5xl mx-auto px-4 sm:px-5 pt-3 sm:pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 shrink-0 bg-amber rounded flex items-center justify-center font-sign font-bold text-asphalt text-base shadow-sm">
            P
          </div>
          <div className="min-w-0">
            <h1 className="font-sign font-semibold text-lane text-base sm:text-[17px] leading-tight truncate">
              Shambhu parking and washing centre
            </h1>
          </div>
        </div>
        <button
          onClick={signOut}
          className="text-steel hover:text-lane text-xs font-semibold px-2.5 py-1 rounded bg-asphalt2/80 hover:bg-asphalt2 border border-white/10 transition-colors shrink-0"
        >
          Sign out
        </button>
      </div>

      <nav className="max-w-5xl mx-auto px-2 sm:px-5 flex gap-1 overflow-x-auto no-scrollbar scroll-smooth">
        {TABS.map((t) => {
          const isActive = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-t-md whitespace-nowrap transition-colors ${isActive
                  ? "bg-lane text-asphalt shadow-sm"
                  : "text-[#B7BCC6] hover:text-lane hover:bg-white/5"
                }`}
            >
              <span className={isActive ? "text-asphalt" : "text-amber"}>{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

