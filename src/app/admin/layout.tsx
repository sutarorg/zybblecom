import "@/styles/admin.css";
import type { Metadata } from "next";
import { connection } from "next/server";
import { adminSession } from "@/services/admin/server";
import { AdminChrome } from "@/components/admin/chrome";
import { AccessState } from "@/components/admin/ui";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const result = await adminSession();
  return (
    <AdminChrome
      session={result.ok ? result.value : undefined}
      error={result.ok ? undefined : result.error}
    >
      {result.ok || result.error === "unavailable" ? (
        children
      ) : (
        <AccessState error={result.error} />
      )}
    </AdminChrome>
  );
}
