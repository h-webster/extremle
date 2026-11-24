import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto flex max-w-3xl flex-col-reverse items-center justify-between gap-2 px-4 py-6 text-[12px] text-text-muted sm:flex-row">
        <p>
          Level data and theming inspired by{" "}
          <a
            href="https://pointercrate.com"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-text-secondary"
          >
            Pointercrate
          </a>
        </p>
        <div className="flex items-center">
          <a
            href="https://github.com/h-webster/extremedemle"
            target="_blank"
            rel="noreferrer"
            title="View source on GitHub"
            aria-label="View source on GitHub"
            className="flex h-8 w-8 items-center justify-center opacity-80 transition-[opacity,transform] duration-100 hover:opacity-100 active:scale-90"
          >
            <Image src="/github.svg" alt="" width={18} height={18} className="dark:hidden" />
            <Image
              src="/github-white.svg"
              alt=""
              width={18}
              height={18}
              className="hidden dark:block"
            />
          </a>
          <a
            href="https://discord.gg/3GncsZhZ5u"
            target="_blank"
            rel="noreferrer"
            title="Join the Discord"
            aria-label="Join the Discord"
            className="flex h-8 w-8 items-center justify-center opacity-80 transition-[opacity,transform] duration-100 hover:opacity-100 active:scale-90"
          >
            <Image src="/discord.svg" alt="" width={18} height={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
