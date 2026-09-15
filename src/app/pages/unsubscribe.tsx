import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import Logo from "../../components/Logo";
import { unsubscribeByToken } from "../lib/mailer";
import { Button } from "../ui/kit";

export default function UnsubscribePage({ route }: { route: string }) {
  const token = route.split("/unsubscribe/")[1]?.split("?")[0] ?? "";
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-[24px] border border-black/[0.06] bg-white p-8 text-center shadow-[0_32px_80px_-32px_rgba(20,18,15,0.18)]"
      >
        <div className="flex justify-center">
          <Logo />
        </div>
        {done ? (
          <>
            <div className="mx-auto mt-8 grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-5 w-5" />
            </div>
            <h1 className="mt-4 font-display text-[19px] font-semibold text-neutral-950">
              You're unsubscribed
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
              <span className="font-medium text-neutral-800">{done}</span> has been added to the
              suppression list and will never be contacted again.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-[19px] font-semibold text-neutral-950">
              Unsubscribe from these emails?
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
              You'll stop receiving this sequence immediately. This can't be undone.
            </p>
            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-600">
                This unsubscribe link is invalid.
              </p>
            )}
            <Button
              className="mt-6 w-full"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await unsubscribeByToken(token);
                  if (res) setDone(res.email);
                  else setError(true);
                } catch {
                  setError(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm unsubscribe
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
