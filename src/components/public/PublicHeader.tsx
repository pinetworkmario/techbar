import Link from "next/link";
import { Network } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
            <Network className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">
              PI Network
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">
              Business Technology
            </div>
          </div>
        </Link>
        <nav className="hidden gap-7 text-sm text-slate-600 md:flex">
          <a href="#multisite" className="hover:text-slate-900">Multi-site</a>
          <a href="#services" className="hover:text-slate-900">Services</a>
          <a href="#lifecycle" className="hover:text-slate-900">Lifecycle</a>
          <a href="#portal" className="hover:text-slate-900">Portal</a>
          <a href="#referral" className="hover:text-slate-900">Referral</a>
        </nav>
        <div className="flex items-center gap-2">
          <LinkButton href="/portal" variant="secondary" size="sm">
            View Portal Demo
          </LinkButton>
          <LinkButton href="#cta" variant="primary" size="sm" className="hidden sm:inline-flex">
            Talk to Us
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
