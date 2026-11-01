import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

export function CareHeader({
  eyebrow,
  title,
  description,
  nextHref,
  nextLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  nextHref: string;
  nextLabel: string;
}) {
  return (
    <header className="border-b border-[#d9cfc3] bg-[#284a63] text-[#fffaf2]">
      <div className="page-shell py-10 sm:py-16">
        <Link
          href="/care"
          className="inline-flex min-h-11 items-center gap-2 text-xs text-[#c6e2f2] hover:text-white"
        >
          <ArrowLeft size={15} />
          全部照顧工具
        </Link>
        <p className="mt-7 text-xs font-semibold tracking-[.22em] text-[#b8d8ed]">
          {eyebrow}
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="editorial-title text-4xl sm:text-6xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#e3edf1]">
              {description}
            </p>
          </div>
          <Link
            href={nextHref}
            className="inline-flex min-h-11 items-center gap-2 border-b border-[#c6e2f2] text-sm text-[#c6e2f2] hover:text-white"
          >
            {nextLabel}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
