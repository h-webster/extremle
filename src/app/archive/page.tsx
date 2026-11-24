import ArchiveList from "@/app/archive/ArchiveList";

export const metadata = {
  title: "Archive | Extremle",
  description:
    "Browse every past Extremle puzzle and replay any day you missed. Guess the Geometry Dash extreme demon from that date in six tries.",
};

export default function ArchivePage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <ArchiveList
        header={
          <>
            <h1 className="text-xl font-bold text-text-primary">Past puzzles</h1>
            <p className="mt-2 text-[14px] text-text-secondary">
              Missed a day? Every previous puzzle stays playable.
            </p>
          </>
        }
      />
    </div>
  );
}
