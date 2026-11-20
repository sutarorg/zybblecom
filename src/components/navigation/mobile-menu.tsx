"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useRef, useState } from "react";
import { navigation } from "@/config/site";
import { Action } from "@/components/ui/primitives";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  return (
    <div
      className="mobile-nav"
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          setOpen(false);
          menu.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        className="menu-toggle"
        type="button"
        ref={menu}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      <nav
        className="mobile-panel"
        id="mobile-menu"
        aria-label="Mobile navigation"
        hidden={!open}
      >
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
        <Link href="/login" onClick={() => setOpen(false)}>
          Log in
        </Link>
        <div onClick={() => setOpen(false)}>
          <Action href="/pricing">Get started</Action>
        </div>
      </nav>
    </div>
  );
}
