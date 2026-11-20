# Video processing: not yet enabled

The current branch contains persistent media, quote, job, clip and worker task relations, plus the reservation/settlement/release RPCs. It does **not** include R2 access, uploads, ClipSDK submission/webhooks, archive workers, Supabase Cron, or creator media adapters. The user interface must not await or claim a real job before these exist.

Planned gating sequence:
1. Private R2 origin-scoped CORS for browser PUTs, durable upload sessions and server-controlled keys. Multipart init/sign/list/complete/abort; list parts and check sizes, then verify media metadata independently. Do not treat client duration or file content type as verified. Prove the initial 2 GB / 180-minute limits and clean abandoned objects/sessions.
2. Dispatch `POST /v1/clips?wait=0` only after credit reservation and trusted input verification. Persist encrypted immutable request bytes, including the source URL, and one stable provider key. Bound dispatch to provider account quotas and honor Retry-After. Unknown state after the idempotency window requires investigation, not another paid job.
3. Verify signed raw webhook bytes before durable receipt; correlate via known job ID, then reconcile against provider status. Archive all required returned assets to private R2 with leases, per-attempt fencing, HTTPS host allowlists, no redirects, and bounded transfer/storage. Mark completion only after stored files are available. Keep clip rank/score/stages only when verified.
4. Exercise direct upload, actual processing, recovery and signed download using a real short MP4 in staging. No claimed latency, codec coverage or provider throughput until measured.
