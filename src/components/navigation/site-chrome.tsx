import Link from "next/link";
import { connection } from "next/server";
import { navigation } from "@/config/site";
import { Action, Brand } from "@/components/ui/primitives";
import { accountServer } from "@/lib/services/account-server";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  // The session is request-specific, even when Auth is configured only at runtime.
  await connection();
  const session = await accountServer.getSession();
  const signedIn = session.ok && Boolean(session.value);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          {signedIn ? (
            <Action href="/dashboard">Dashboard</Action>
          ) : (
            <>
              <Link href="/login" className="login-link">
                Log in
              </Link>
              <Action href="/signup">Get started</Action>
            </>
          )}
        </div>
        <MobileMenu signedIn={signedIn} />
      </div>
    </header>
  );
}
const footerGroups = [
  {
    title: "Product",
    links: [
      ...navigation.slice(0, 4),
      { href: "/examples", label: "Examples" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/resources", label: "Resources" },
      { href: "/help", label: "Help centre" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Log in" },
    ],
  },
];
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand />
            <p>Give your best moments a second life.</p>
          </div>
          {footerGroups.map((group) => (
            <nav aria-label={`${group.title} links`} key={group.title}>
              <p className="footer-label">{group.title}</p>
              {group.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getUTCFullYear()} Zybble.</span>
          <span>From long-form to short-form.</span>
        </div>
      </div>
    </footer>
  );
}
