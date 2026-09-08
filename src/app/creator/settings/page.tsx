import { eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { payoutAccounts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { BankForm } from "@/components/bank-form";
import { maskAccount } from "@/lib/utils";

export const metadata = { title: "Bank & payout settings" };

export default async function CreatorSettingsPage() {
  const user = await requireUser("/creator/settings");
  const [bank] = await db
    .select()
    .from(payoutAccounts)
    .where(eq(payoutAccounts.userId, user.id))
    .limit(1);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Settlement bank account</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Your cleared earnings are transferred here every day at 4:00 PM via
          Razorpay. Banking data is encrypted in transit and never exposed to
          browsers.
        </p>

        {bank && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-cream/70 p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold">{bank.holderName}</p>
              <p className="text-ink-soft">
                {maskAccount(bank.accountNumber)} · {bank.ifsc}
              </p>
              <p className="mt-1 text-xs text-ink-soft/70">
                Submit the form below to replace these details.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <BankForm hasAccount={Boolean(bank)} />
        </div>
      </Card>

      <Card className="space-y-2 bg-cream/60 p-5 text-[13px] text-ink-soft shadow-none">
        <p className="font-semibold text-ink">How settlement works</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Sales credit 90% to your balance the moment payment is verified.</li>
          <li>
            The scheduled settlement runs daily at 4:00 PM — no withdrawal
            requests needed.
          </li>
          <li>Every payout carries a Razorpay transfer ID for your records.</li>
          <li>A failed payout retries in the next run automatically.</li>
        </ul>
      </Card>
    </div>
  );
}
