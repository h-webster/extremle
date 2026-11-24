import Link from "next/link";

export const metadata = {
  title: "How to Play | Extremle",
  description:
    "How to play Extremle: guess the daily Geometry Dash extreme demon in six tries, using hints on list tier, tags, publisher, song, and thumbnail.",
};

const HINT_SCHEDULE = [
  { after: "Guess 1", reveals: "Whether the level sits on the Main List (top 75) or the Extended List (76-150)." },
  { after: "Guess 2", reveals: "Its gameplay tags (Wave, Ship, Timings, etc.), cross-referenced from AREDL." },
  { after: "Guess 3", reveals: "Who published it and who verified it." },
  { after: "Guess 4", reveals: "The level's song and artist, where available." },
  { after: "Guess 5", reveals: "A blurred thumbnail pulled from the level's verification video." },
];

export default function HowToPlayPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <h1 className="text-xl font-bold text-text-primary">How to play</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
        Every day, Extremle picks one rated level from the top 150 of the
        Pointercrate demonlist. You have six guesses to name it. Guesses are
        picked from the pointercrate demon list.
      </p>

      <section className="mt-8">
        <h2 className="text-[14px] font-semibold text-text-primary">Reading a guess</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
          Every guess that isn&apos;t the answer tells you whether the real
          level ranks harder (closer to #1, the hardest rated level) or
          easier (further down the list) than what you guessed.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-[14px] font-semibold text-text-primary">Hints</h2>
        <div className="mt-2 border-t border-border">
          {HINT_SCHEDULE.map((row) => (
            <div key={row.after} className="flex flex-col gap-0.5 border-b border-border py-2.5 sm:flex-row sm:gap-4">
              <span className="w-20 shrink-0 text-[12px] text-text-muted">{row.after}</span>
              <span className="text-[13px] leading-relaxed text-text-secondary">{row.reveals}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[14px] font-semibold text-text-primary">Everything is on this device</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
          Streaks and stats are saved to your browser&apos;s local storage,
          not an account. Back them up or move them to another device from
          the <Link href="/stats" className="text-accent underline">Stats</Link> page.
        </p>
      </section>

      <Link
        href="/"
        className="mt-10 inline-block border border-border px-5 py-2.5 text-[14px] font-semibold text-text-primary transition-transform duration-100 hover:bg-bg-card-hover active:scale-95"
      >
        Play today&apos;s puzzle
      </Link>
    </div>
  );
}
