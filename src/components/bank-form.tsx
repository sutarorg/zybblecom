"use client";

import { useActionState } from "react";
import { Landmark } from "lucide-react";
import { saveBankAccount, type SimpleState } from "@/lib/actions/creator";
import { Button, Spinner, inputClasses, labelClasses } from "@/components/ui";

export function BankForm({ hasAccount }: { hasAccount: boolean }) {
  const [state, formAction, pending] = useActionState<SimpleState, FormData>(
    saveBankAccount,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClasses} htmlFor="holderName">Account holder name</label>
        <input id="holderName" name="holderName" required maxLength={80} className={inputClasses} placeholder="As per bank records" autoComplete="off" />
      </div>
      <div>
        <label className={labelClasses} htmlFor="accountNumber">Bank account number</label>
        <input id="accountNumber" name="accountNumber" required inputMode="numeric" pattern="\d{9,18}" className={inputClasses} placeholder="9–18 digits" autoComplete="off" />
      </div>
      <div>
        <label className={labelClasses} htmlFor="ifsc">IFSC code</label>
        <input id="ifsc" name="ifsc" required maxLength={11} className={inputClasses + " uppercase"} placeholder="e.g. HDFC0001234" autoComplete="off" />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">{state.success}</p>
      )}

      <Button type="submit" variant="brand" size="lg" disabled={pending} className="w-full">
        {pending ? <Spinner /> : <><Landmark className="size-4" /> {hasAccount ? "Update bank account" : "Save bank account"}</>}
      </Button>
    </form>
  );
}
