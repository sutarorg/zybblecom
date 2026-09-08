import { Settings2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/settings";
import { razorpayConfigured } from "@/lib/razorpay";
import { Badge, Card } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export const metadata = { title: "Platform settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getPlatformSettings();
  const live = razorpayConfigured();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Settings2 className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">Payout rules & fees</h2>
            <p className="text-sm text-ink-soft">Applied to all future transactions and settlement runs.</p>
          </div>
        </div>
        <div className="mt-6">
          <SettingsForm
            initial={{
              feePercent: settings.feePercent,
              minPayoutRupees: settings.minPayoutPaise / 100,
              pendingHours: settings.pendingHours,
            }}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Integrations</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
            <div>
              <p className="font-semibold">Razorpay payments</p>
              <p className="text-xs text-ink-soft">Orders, signature verification, webhooks</p>
            </div>
            <Badge tone={live ? "green" : "amber"}>{live ? "Live" : "Test mode"}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
            <div>
              <p className="font-semibold">Webhook endpoint</p>
              <p className="font-mono text-xs text-ink-soft">https://zybble.com/api/webhooks/razorpay</p>
            </div>
            <Badge tone="neutral">payment.captured</Badge>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
            <div>
              <p className="font-semibold">Settlement scheduler</p>
              <p className="text-xs text-ink-soft">In-process cron, daily at 4:00 PM (Asia/Kolkata)</p>
            </div>
            <Badge tone="green">Active</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
