import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="border-t border-line bg-cream/60 pb-24 pt-12 md:pb-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-soft">
            Sell what you know with a single link. Secure checkout, instant
            student access and automatic payouts straight to your bank.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm text-ink-soft">
          <a href="/#how-it-works" className="hover:text-ink">How it works</a>
          <a href="/#why-zybble" className="hover:text-ink">Why Zybble</a>
          <a href="/#faq" className="hover:text-ink">FAQ</a>
          <a href="/auth?mode=signup" className="hover:text-ink">Become a creator</a>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl items-center justify-between px-4 text-xs text-ink-soft/70 sm:px-6">
        <span>© {new Date().getFullYear()} zybble.com</span>
        <span>Payments secured by Razorpay</span>
      </div>
    </footer>
  );
}
