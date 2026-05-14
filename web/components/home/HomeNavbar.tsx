import Link from "next/link";

export default function HomeNavbar({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-card">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-red">LAP</span>
          <span className="text-off-white">VAULT</span>
        </span>
        <nav className="flex items-center gap-4">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="text-sm font-semibold px-4 py-2 rounded-md bg-red text-off-white transition-colors hover:bg-red-light"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted transition-colors hover:text-off-white">
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold px-4 py-2 rounded-md bg-red text-off-white transition-colors hover:bg-red-light"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}