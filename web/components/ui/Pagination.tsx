import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
}

export default function Pagination({ page, totalPages, total, basePath }: Props) {
  if (totalPages <= 1) return null;

  const btn =
    "px-4 py-2 rounded-lg border text-sm font-medium transition-colors";
  const active = `${btn} bg-card border-card text-off-white hover:border-red/40`;
  const disabled = `${btn} bg-card/30 border-card/30 text-muted cursor-not-allowed`;

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      {page > 1 ? (
        <Link href={`${basePath}?page=${page - 1}`} className={active}>
          ← Prev
        </Link>
      ) : (
        <span className={disabled}>← Prev</span>
      )}

      <span className="text-sm text-muted">
        Page {page} of {totalPages}
        <span className="hidden sm:inline"> · {total} total</span>
      </span>

      {page < totalPages ? (
        <Link href={`${basePath}?page=${page + 1}`} className={active}>
          Next →
        </Link>
      ) : (
        <span className={disabled}>Next →</span>
      )}
    </div>
  );
}
