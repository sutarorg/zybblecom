"use client";

import { useActionState } from "react";
import { savePlatformSettings, type SettingsState } from "@/lib/actions/admin";
import { Button, Spinner, inputClasses, labelClasses } from "@/components/ui";

export function SettingsForm({
  initial,
}: {
  initial: { feePercent: number; minPayoutRupees: number; pendingHours: number };
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    savePlatformSettings,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClasses} htmlFor="feePercent">Platform fee (%)</label>
        <input id="feePercent" name="feePercent" type="number" min={0} max={30} required defaultValue={initial.feePercent} className={inputClasses} />
        <p className="mt-1 text-xs text-ink-soft">Zybble keeps this share of every sale; the creator gets the rest.</p>
      </div>
      <div>
        <label className={labelClasses} htmlFor="minPayoutRupees">Minimum payout (₹)</label>
        <input id="minPayoutRupees" name="minPayoutRupees" type="number" min={1} required defaultValue={initial.minPayoutRupees} className={inputClasses} />
        <p className="mt-1 text-xs text-ink-soft">Balances below this roll over to the next settlement run.</p>
      </div>
      <div>
        <label className={labelClasses} htmlFor="pendingHours">Clearing period (hours)</label>
        <input id="pendingHours" name="pendingHours" type="number" min={0} max={720} required defaultValue={initial.pendingHours} className={inputClasses} />
        <p className="mt-1 text-xs text-ink-soft">Sales become eligible for payout this many hours after purchase. 0 = instantly eligible.</p>
      </div>

      {state?.error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{state.error}</p>}
      {state?.success && <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">{state.success}</p>}

      <Button type="submit" variant="ink" size="lg" disabled={pending} className="w-full">
        {pending ? <Spinner /> : "Save settings"}
      </Button>
    </form>
  );
}
