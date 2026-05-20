import Link from "next/link";

export default function HomeFooter({ loggedIn }: { loggedIn: boolean }) {
  return (
    <footer className="bg-surface border-t border-card">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
        <span>
          <span className="font-bold text-red">LAP</span>
          <span className="font-bold text-off-white">VAULT</span>
          {" "}— Track day data platform
        </span>
        <div className="flex gap-6">
          {loggedIn ? (
            <Link href="/dashboard" className="hover:text-off-white transition-colors">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-off-white transition-colors">Log in</Link>
              <Link href="/register" className="hover:text-off-white transition-colors">Register</Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
