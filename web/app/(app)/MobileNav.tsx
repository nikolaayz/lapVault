"use client";

import { useState } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function MobileNav({
  isAdmin,
  user,
}: {
  isAdmin: boolean;
  user: { name: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <span className={`block w-5 h-0.5 bg-off-white transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`block w-5 h-0.5 bg-off-white transition-all duration-200 ${open ? "opacity-0" : ""}`} />
        <span className={`block w-5 h-0.5 bg-off-white transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {open && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-surface border-b border-card z-40 px-6 py-4 flex flex-col">
          <Link href="/dashboard" onClick={close} className="py-3 text-sm text-muted hover:text-off-white transition-colors border-b border-card/50">Dashboard</Link>
          <Link href="/garage" onClick={close} className="py-3 text-sm text-muted hover:text-off-white transition-colors border-b border-card/50">Garage</Link>
          <Link href="/laps" onClick={close} className="py-3 text-sm text-muted hover:text-off-white transition-colors border-b border-card/50">Laps</Link>
          <Link href="/events" onClick={close} className="py-3 text-sm text-muted hover:text-off-white transition-colors border-b border-card/50">Events</Link>
          <Link href="/leaderboard" onClick={close} className="py-3 text-sm text-muted hover:text-off-white transition-colors border-b border-card/50">Leaderboard</Link>
          {isAdmin && (
            <Link href="/admin" onClick={close} className="py-3 text-sm text-blue hover:text-off-white transition-colors border-b border-card/50">Admin</Link>
          )}
          <div className="pt-3 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/profile" onClick={close} className="py-2 text-sm font-semibold text-off-white hover:text-red transition-colors">{user.name}</Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" onClick={close} className="py-2 text-sm font-semibold text-muted hover:text-off-white transition-colors">Sign In</Link>
                <Link href="/register" onClick={close} className="py-2 text-sm font-semibold bg-red text-off-white px-3 rounded-md hover:opacity-90 transition-opacity text-center">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
