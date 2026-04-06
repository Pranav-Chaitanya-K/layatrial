import { NavLink } from "react-router-dom";
import { useThemeAccent } from "../context/ThemeAccentContext";

/**
 * Left rail: large **mine** mark, theme-colored active states, playful tooltips.
 */

const iconClass = "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110";

function IconHome() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function IconLibrary() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function IconQueue() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function IconLiked() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

const NAV_MAIN = [
  { to: "/", label: "Home", sub: "Your feed", Icon: IconHome, end: true },
  { to: "/search", label: "Search", sub: "Dig the catalog", Icon: IconSearch, end: false },
  { to: "/library", label: "Library", sub: "Saved mixes", Icon: IconLibrary, end: false },
  { to: "/queue", label: "Queue", sub: "Line up next", Icon: IconQueue, end: false },
  { to: "/liked", label: "Liked", sub: "Stuff you love", Icon: IconLiked, end: false },
];

const SETTINGS_ITEM = { to: "/settings", label: "Settings", sub: "Make it yours", Icon: IconSettings, end: false };

function NavRow({ to, label, sub, Icon, end, iconOnly, accent }) {
  const tip = `${label} — ${sub}`;
  return (
    <NavLink
      to={to}
      end={end}
      title={tip}
      className={({ isActive }) =>
        [
          "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
          iconOnly ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
          isActive
            ? `bg-white/[0.1] text-white shadow-[inset_4px_0_0_0] ${accent.navInset}`
            : `text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100 ${accent.navHoverGlow} hover:shadow-sm`,
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? accent.navIconActive : "text-zinc-500 group-hover:text-zinc-300"}>
            <Icon />
          </span>
          {!iconOnly && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate tracking-tight">{label}</span>
              <span className="truncate text-[10px] font-normal text-zinc-500 group-hover:text-zinc-400">{sub}</span>
            </span>
          )}
          {iconOnly && (
            <span
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/12 bg-zinc-950/98 px-3 py-2 text-xs font-medium text-zinc-100 opacity-0 shadow-2xl backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              role="tooltip"
            >
              {tip}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ iconOnly = false }) {
  const accent = useThemeAccent();

  return (
    <aside
      className={
        iconOnly
          ? "fixed left-0 top-0 z-40 flex h-screen w-[4.5rem] flex-col border-r border-white/8 bg-zinc-950/95 py-4 pl-2 pr-2 shadow-[6px_0_32px_-12px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
          : "fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-white/8 bg-zinc-950/95 py-5 pl-3 pr-2 shadow-[6px_0_32px_-12px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
      }
      aria-label="Main navigation"
    >
      <div
        className={
          iconOnly
            ? "mb-5 flex justify-center px-1"
            : "mb-6 flex items-center gap-3 px-2"
        }
        title="mine"
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent.gradient} font-serif text-lg font-semibold text-white shadow-lg ring-2 ring-white/15 transition-all duration-300 hover:scale-[1.04] hover:shadow-xl`}
        >
          m
        </div>
        {!iconOnly && (
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-[0.12em] text-white">mine</p>
            <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">music</p>
          </div>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto utopian-scrollbar pr-0.5" role="navigation">
        {NAV_MAIN.map((item) => (
          <NavRow key={item.to} {...item} iconOnly={iconOnly} accent={accent} />
        ))}
      </nav>

      <div className={iconOnly ? "mt-auto border-t border-white/[0.07] pt-3" : "mt-auto border-t border-white/[0.07] pt-4"}>
        <NavRow {...SETTINGS_ITEM} iconOnly={iconOnly} accent={accent} />
      </div>
    </aside>
  );
}
