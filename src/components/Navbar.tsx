import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="16" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 20V11M12 20V4M19 20v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9.6 9.5a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1 .8-1 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** Flat Santa hat, drawn to sit tilted on the wordmark's first letter. */
function SantaHat() {
  return (
    <svg
      width="18"
      height="15"
      viewBox="0 0 24 20"
      aria-hidden="true"
      className="pointer-events-none absolute -left-[5px] -top-[7px] -rotate-[18deg]"
    >
      <path d="M3 15 C5 7 10 2 16 3 C19 3.5 21 6 21 9 L18 8 C17 12 16 14 15.5 15 Z" fill="#c62828" />
      <rect x="1.5" y="14" width="16" height="4.5" rx="2.2" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.6" />
      <circle cx="20.5" cy="10" r="2.6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.6" />
    </svg>
  );
}

const WORDMARK = "Extremle";
// Christmas red / green, alternating per letter (CSS vars so dark mode gets brighter shades)
const WORDMARK_COLORS = ["var(--color-xmas-red)", "var(--color-xmas-green)"];

/**
 * Seasonal (Christmas) version of the "Extremle" wordmark: letters alternate
 * red and green, with a Santa hat on the "E". To go back to the plain
 * wordmark after the holidays, swap <ChristmasWordmark /> in the navbar for
 * the plain text span.
 */
function ChristmasWordmark() {
  return (
    <span className="relative font-bold text-[15px] tracking-tight" aria-label={WORDMARK}>
      <SantaHat />
      {WORDMARK.split("").map((letter, i) => (
        <span key={i} aria-hidden="true" style={{ color: WORDMARK_COLORS[i % 2] }}>
          {letter}
        </span>
      ))}
    </span>
  );
}

const ICON_LINKS = [
  { href: "/archive", label: "Archive", icon: CalendarIcon },
  { href: "/stats", label: "Stats", icon: BarChartIcon },
  { href: "/how-to-play", label: "How to play", icon: HelpIcon },
];

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/extremlelogo-removebg.png"
            alt="Extremle"
            width={28}
            height={28}
            className="shrink-0"
            priority
          />
          <ChristmasWordmark />
          <span className="hidden text-[12px] text-text-muted sm:inline">
            Extreme Demon List Wordle
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {ICON_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              aria-label={link.label}
              className="flex h-9 w-9 items-center justify-center text-text-secondary transition-transform duration-100 hover:text-text-primary active:scale-90"
            >
              <link.icon />
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
