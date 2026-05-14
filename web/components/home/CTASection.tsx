import Link from "next/link";

export default function CTASection({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 text-center">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
        Ready to beat your best lap?
      </h2>
      {loggedIn ? (
        <>
          <p className="text-base mb-8 text-muted">Head back to your dashboard and keep pushing.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-10 py-4 rounded-md font-semibold text-base bg-red text-off-white transition-colors hover:bg-red-light"
          >
            Go to Dashboard
          </Link>
        </>
      ) : (
        <>
          <p className="text-base mb-8 text-muted">
            Join hundreds of drivers already using LapVault on track.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-10 py-4 rounded-md font-semibold text-base bg-red text-off-white transition-colors hover:bg-red-light"
          >
            Create Free Account
          </Link>
        </>
      )}
    </section>
  );
}
