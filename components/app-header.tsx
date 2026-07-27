import Link from "next/link";
import { signOut } from "@/app/actions";
import { LogoLockup } from "@/components/logo";

export function AppHeader({
  email,
  isAdmin = false,
}: {
  email: string;
  isAdmin?: boolean;
}) {
  return (
    <header className="border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3">
        <Link href="/">
          <LogoLockup />
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-purple underline underline-offset-4"
            >
              Admin
            </Link>
          )}
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.1em] text-muted sm:inline">
            {email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="border-[3px] border-ink bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink transition-all duration-100 hover:bg-ink hover:text-paper"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
