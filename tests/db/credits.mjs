import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
const work = await mkdtemp(join(tmpdir(), "zybble-db-"));
const db = new EmbeddedPostgres({
  databaseDir: join(work, "db"),
  password: randomUUID(),
  port: 55197,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
});
const clients = [];
async function connect() {
  const c = db.getPgClient();
  clients.push(c);
  await c.connect();
  return c;
}
const id = () => randomUUID();
let started = false;
try {
  await db.initialise();
  await db.start();
  started = true;
  const c = await connect(),
    a = await connect(),
    b = await connect();
  const q = (sql, params) => c.query(sql, params);
  // Isolated stand-in for the Supabase-managed Auth schema and default API roles.
  await q(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; grant usage on schema auth to authenticated;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  for (const f of (await readdir("supabase/migrations")).sort())
    await q(await readFile(`supabase/migrations/${f}`, "utf8"));
  const [owner, other, admin, purchase] = Array.from({ length: 4 }, id);
  await q(
    "insert into auth.users values ($1,'owner@example.invalid','{\"role\":\"admin\"}'),($2,'other@example.invalid',null),($3,'admin@example.invalid',null)",
    [owner, other, admin],
  );
  const avatarKey = `avatars/${owner}/${id()}.webp`;
  await assert.rejects(
    q("update profiles set avatar_object_key=$1 where id=$2", [
      avatarKey,
      other,
    ]),
    /creator_avatar_owner_path/,
  );
  const avatarAccess = await q(`select
    has_column_privilege('authenticated','profiles','avatar_object_key','update') as user_write,
    has_column_privilege('service_role','profiles','avatar_object_key','update') as server_write`);
  assert.deepEqual(avatarAccess.rows[0], {
    user_write: false,
    server_write: true,
  });
  await q("update profiles set avatar_object_key=$1 where id=$2", [
    avatarKey,
    owner,
  ]);
  await q("update auth.users set email='updated@example.invalid' where id=$1", [
    owner,
  ]);
  assert.deepEqual(
    (await q("select email from profiles where id=$1", [owner])).rows,
    [{ email: "updated@example.invalid" }],
  );
  assert.deepEqual(
    (await q("select role from user_roles where user_id=$1", [owner])).rows,
    [{ role: "user" }],
  );
  await q(
    "insert into credit_purchases(id,user_id,pack_slug,credits,amount_minor,currency,provider_mode,dodo_product_id,dodo_checkout_session_id) values($1,$2,'creator',120,1900,'USD','test_mode','test-product','test-session')",
    [purchase, owner],
  );
  await Promise.all([a, b].map((x) => x.query("set role service_role")));
  const grant =
    "select grant_purchase_credits($1,'test-session','test-payment','test-product',$2,'USD',1,'test_mode') as granted";
  await assert.rejects(a.query(grant, [purchase, 1800]), /PAYMENT_MISMATCH/);
  assert.deepEqual(
    (await Promise.all([a, b].map((x) => x.query(grant, [purchase, 1900]))))
      .map((x) => x.rows[0].granted)
      .sort(),
    [false, true],
  );
  assert.equal(
    (await q("select balance from credit_wallets where user_id=$1", [owner]))
      .rows[0].balance,
    120,
  );
  // Exercise each frozen test snapshot against the real wallet transaction.
  const matrixOwner = id();
  await q("insert into auth.users values ($1,'matrix@example.invalid',null)", [
    matrixOwner,
  ]);
  const matrix = [
    ["starter", "USD", 900, 30],
    ["creator", "USD", 1900, 120],
    ["studio", "USD", 3900, 300],
    ["starter", "INR", 29900, 30],
    ["creator", "INR", 99900, 120],
    ["studio", "INR", 249900, 300],
  ];
  let total = 0;
  for (const [pack, currency, amount, credits] of matrix) {
    const [pid, session, paymentId, product] = Array.from({ length: 4 }, id);
    await q(
      `insert into credit_purchases(id,user_id,pack_slug,credits,amount_minor,currency,provider_mode,dodo_product_id,dodo_checkout_session_id)
      values($1,$2,$3,$4,$5,$6,'test_mode',$7,$8)`,
      [pid, matrixOwner, pack, credits, amount, currency, product, session],
    );
    const fulfill =
      "select grant_purchase_credits($1,$2,$3,$4,$5,$6,$7,'test_mode') as granted";
    await assert.rejects(
      a.query(fulfill, [pid, session, paymentId, product, amount, currency, 2]),
      /PAYMENT_MISMATCH/,
    );
    assert.equal(
      (
        await a.query(fulfill, [
          pid,
          session,
          paymentId,
          product,
          amount,
          currency,
          1,
        ])
      ).rows[0].granted,
      true,
    );
    total += credits;
    assert.equal(
      (
        await q("select balance from credit_wallets where user_id=$1", [
          matrixOwner,
        ])
      ).rows[0].balance,
      total,
    );
  }
  assert.equal(
    (
      await q(
        "select coalesce(sum(amount),0)::int as credits from credit_transactions where user_id=$1",
        [matrixOwner],
      )
    ).rows[0].credits,
    total,
  );
  await q("update profiles set onboarding_completed=true where id=$1", [owner]);
  async function quote(duration, expiry = "5 minutes") {
    const [project, asset, quote] = Array.from({ length: 3 }, id);
    await q(
      "insert into projects(id,user_id,title) values($1,$2,'SQL fixture')",
      [project, owner],
    );
    await q(
      "insert into media_assets(id,user_id,project_id,asset_type,bucket_name,object_key,mime_type,duration_seconds,upload_status,storage_status) values($1,$2,$3,'original_video','test',$1::text,'video/mp4',$4,'verified','ready')".replace(
        "$1::text",
        "$1::uuid::text",
      ),
      [asset, owner, project, duration],
    );
    await q("update projects set original_media_asset_id=$1 where id=$2", [
      asset,
      project,
    ]);
    await q(
      "insert into generation_quotes(id,user_id,project_id,settings,required_credits,expires_at,source_asset_id,source_duration_seconds) values($1,$2,$3,$4,$5,now()+$6::interval,$7,$8)",
      [
        quote,
        owner,
        project,
        {
          clipCount: 5,
          minSeconds: 20,
          maxSeconds: 60,
          aspect: "9:16",
          reframe: "auto",
          captions: "bold",
        },
        Math.ceil(duration / 60),
        expiry,
        asset,
        duration,
      ],
    );
    return { quote, project, asset };
  }
  const quotes = [await quote(4800), await quote(4800)];
  const params = quotes.map((x) => [owner, x.quote, id()]);
  const reserve = "select reserve_generation_credits($1,$2,$3) as job";
  const changed = await quote(4800);
  await q("update media_assets set duration_seconds=4799 where id=$1", [
    changed.asset,
  ]);
  await assert.rejects(
    a.query(reserve, [owner, changed.quote, id()]),
    /SOURCE_QUOTE_MISMATCH/,
  );
  await q("update media_assets set duration_seconds=4800 where id=$1", [
    changed.asset,
  ]);
  const replacement = id();
  await q(
    `insert into media_assets(id,user_id,project_id,asset_type,bucket_name,object_key,mime_type,duration_seconds,upload_status,storage_status)
    values($1,$2,$3,'original_video','test',$1::uuid::text,'video/mp4',4800,'verified','ready')`,
    [replacement, owner, changed.project],
  );
  await q("update projects set original_media_asset_id=$1 where id=$2", [
    replacement,
    changed.project,
  ]);
  await assert.rejects(
    a.query(reserve, [owner, changed.quote, id()]),
    /SOURCE_QUOTE_MISMATCH/,
  );
  const expired = await quote(4800, "-1 second");
  await assert.rejects(
    a.query(reserve, [owner, expired.quote, id()]),
    /GENERATION_NOT_ALLOWED/,
  );
  assert.equal(
    (await q("select count(*)::int as count from generation_tasks")).rows[0]
      .count,
    0,
  );
  assert.equal(
    (
      await q("select reserved_balance from credit_wallets where user_id=$1", [
        owner,
      ])
    ).rows[0].reserved_balance,
    0,
  );
  const results = await Promise.allSettled(
    [a, b].map((x, i) => x.query(reserve, params[i])),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const win = results.findIndex((r) => r.status === "fulfilled");
  const job = results[win].value.rows[0].job;
  const bound = (
    await q(
      "select source_asset_id,source_duration_seconds from generation_jobs where id=$1",
      [job],
    )
  ).rows[0];
  assert.deepEqual(bound, {
    source_asset_id: quotes[win].asset,
    source_duration_seconds: "4800",
  });
  assert.match(results[1 - win].reason.message, /INSUFFICIENT_CREDITS/);
  assert.equal((await a.query(reserve, params[win])).rows[0].job, job);
  await assert.rejects(
    a.query("select release_generation_credits($1)", [job]),
    /RELEASE_NOT_ALLOWED/,
  );
  await q(
    "update generation_jobs set status='provider_succeeded', clipsdk_job_id='test-provider-job' where id=$1",
    [job],
  );
  const knownProvider = "job_q8w2e4r6t1y3u5i7o9p0";
  const receipt = "select record_clipsdk_receipt($1,$2) as accepted";
  assert.equal(
    (await a.query(receipt, [knownProvider, "job.succeeded"])).rows[0].accepted,
    false,
  );
  await assert.rejects(
    a.query(receipt, [knownProvider, "job.running"]),
    /INVALID_CLIPSDK_RECEIPT/,
  );
  await q("update generation_jobs set clipsdk_job_id=$1 where id=$2", [
    knownProvider,
    job,
  ]);
  const deliveries = await Promise.all(
    [a, b].map((provider) =>
      provider.query(receipt, [knownProvider, "job.succeeded"]),
    ),
  );
  assert(deliveries.every((delivery) => delivery.rows[0].accepted));
  assert.deepEqual(
    (
      await q(
        "select provider_event_id, processing_status, payload_sanitized from webhook_events where provider='clipsdk'",
      )
    ).rows,
    [
      {
        provider_event_id: `${knownProvider}:succeeded`,
        processing_status: "pending_reconciliation",
        payload_sanitized: { jobId: job, providerJobId: knownProvider },
      },
    ],
  );
  assert.deepEqual(
    (
      await q(
        "select status, reservation_status from generation_jobs where id=$1",
        [job],
      )
    ).rows,
    [{ status: "provider_succeeded", reservation_status: "reserved" }],
  );
  await q("set role authenticated");
  await assert.rejects(
    q(receipt, [knownProvider, "job.succeeded"]),
    /permission denied/,
  );
  await q("reset role");
  assert.equal(
    (await a.query("select settle_generation_credits($1,81) as settled", [job]))
      .rows[0].settled,
    false,
  );
  assert.equal(
    (
      await q("select reserved_balance from credit_wallets where user_id=$1", [
        owner,
      ])
    ).rows[0].reserved_balance,
    80,
  );
  await q(
    "update generation_jobs set status='provider_succeeded' where id=$1",
    [job],
  );
  const settle = await Promise.all(
    [a, b].map((x) =>
      x.query("select settle_generation_credits($1,60.01) as settled", [job]),
    ),
  );
  assert(settle.every((x) => x.rows[0].settled));
  assert.deepEqual(
    (
      await q(
        "select balance,reserved_balance from credit_wallets where user_id=$1",
        [owner],
      )
    ).rows,
    [{ balance: 59, reserved_balance: 0 }],
  );
  const [archiveClip, archiveAsset] = [id(), id()];
  await q("update generation_jobs set status='completed' where id=$1", [job]);
  await q(
    `insert into media_assets(id,user_id,project_id,asset_type,bucket_name,object_key,mime_type,upload_status,storage_status)
    values($1,$2,$3,'generated_video','private-fixture','clips/archive.mp4','video/mp4','verified','ready')`,
    [archiveAsset, owner, quotes[win].project],
  );
  await q(
    `insert into clips(id,user_id,project_id,generation_job_id,rank,title,start_seconds,end_seconds,duration_seconds,video_asset_id,status)
    values($1,$2,$3,$4,1,'Archive fixture',0,30,30,$5,'ready')`,
    [archiveClip, owner, quotes[win].project, job, archiveAsset],
  );
  const visibleClip =
    "select id,video_asset_id from clips where id=$1 and status='ready'";
  await q("set role authenticated");
  await q("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  assert.deepEqual((await q(visibleClip, [archiveClip])).rows, [
    { id: archiveClip, video_asset_id: archiveAsset },
  ]);
  await assert.rejects(
    q("select object_key from media_assets where id=$1", [archiveAsset]),
    /permission denied/,
  );
  await q("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  assert.deepEqual((await q(visibleClip, [archiveClip])).rows, []);
  await q("reset role");
  await assert.rejects(
    a.query("select adjust_user_credits($1,$2,5,$3,'Valid reason')", [
      other,
      owner,
      id(),
    ]),
    /FORBIDDEN/,
  );
  await q("insert into user_roles(user_id,role) values($1,'admin')", [admin]);
  const adj =
    "select adjust_user_credits($1,$2,5,$3,'Valid reason') as applied";
  const request = id();
  assert.deepEqual(
    (
      await Promise.all(
        [a, b].map((x) => x.query(adj, [admin, owner, request])),
      )
    )
      .map((x) => x.rows[0].applied)
      .sort(),
    [false, true],
  );
  assert.equal(
    (await q("select count(*)::int as count from admin_audit_logs")).rows[0]
      .count,
    1,
  );
  await assert.rejects(a.query("delete from credit_transactions"), {
    code: "42501",
  });
  await q("set role authenticated");
  await q("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  assert.deepEqual((await q("select * from get_credit_wallet()")).rows, [
    { balance: 0, reserved_balance: 0, available_balance: 0 },
  ]);
  assert.deepEqual((await q("select id from projects")).rows, []);
  assert.deepEqual((await q("select id from credit_purchases")).rows, []);
  await assert.rejects(q("select object_key from media_assets"), {
    code: "42501",
  });
  await assert.rejects(q("select dodo_payment_id from credit_purchases"), {
    code: "42501",
  });
  await assert.rejects(q("select * from user_roles"), { code: "42501" });
  await assert.rejects(q("update profiles set suspended_at=now()"), {
    code: "42501",
  });
  await assert.rejects(q(grant, [purchase, 1900]), { code: "42501" });
  await q("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  assert.deepEqual((await q("select * from get_credit_summary()")).rows, [
    { available: 64, reserved: 0, consumed: "61" },
  ]);
  const activity = (
    await q("select kind from list_credit_activity('all')")
  ).rows
    .map((x) => x.kind)
    .sort();
  assert.deepEqual(activity, [
    "adjustment",
    "consume",
    "purchase",
    "release",
    "reserve",
  ]);
  assert.deepEqual(
    (await q("select kind from list_credit_activity('purchases')")).rows,
    [{ kind: "purchase" }],
  );
  await q("reset role");
  const expectedFailure = await quote(60);
  const failedJob = (
    await a.query(reserve, [owner, expectedFailure.quote, id()])
  ).rows[0].job;
  await q("update generation_jobs set status='failed' where id=$1", [
    failedJob,
  ]);
  const next = id();
  await q(
    `insert into generation_quotes(id,user_id,project_id,settings,required_credits,expires_at,source_asset_id,source_duration_seconds)
    select $1,user_id,project_id,settings,required_credits,expires_at,source_asset_id,source_duration_seconds from generation_quotes where id=$2`,
    [next, expectedFailure.quote],
  );
  await assert.rejects(
    a.query(reserve, [owner, next, id()]),
    /UNRESOLVED_RESERVATION/,
  );
  const releases = await Promise.all(
    [a, b].map((client) =>
      client.query("select release_generation_credits($1) as released", [
        failedJob,
      ]),
    ),
  );
  assert.deepEqual(releases.map((r) => r.rows[0].released).sort(), [
    false,
    true,
  ]);
  assert.deepEqual(
    (
      await q(
        "select balance,reserved_balance from credit_wallets where user_id=$1",
        [owner],
      )
    ).rows,
    [{ balance: 64, reserved_balance: 0 }],
  );
  await q("set role authenticated");
  await q("update profiles set full_name='Owner updated' where id=$1", [owner]);
  assert.equal(
    (await q("update profiles set full_name='Not edited' where id=$1", [other]))
      .rowCount,
    0,
  );
  await assert.rejects(q("select save_creator_preferences('unknown','bold')"), {
    code: "22023",
  });
  assert.equal(
    (await q("select save_creator_preferences('4:5','clean') as saved")).rows[0]
      .saved,
    true,
  );
  assert.deepEqual(
    (await q("select full_name,preferences from profiles where id=$1", [owner]))
      .rows,
    [
      {
        full_name: "Owner updated",
        preferences: { defaultAspect: "4:5", defaultCaptions: "clean" },
      },
    ],
  );
  await q("reset role");
  assert.deepEqual(
    (await q("select preferences from profiles where id=$1", [other])).rows,
    [{ preferences: {} }],
  );
  await q("update profiles set suspended_at=now() where id=$1", [owner]);
  await q("set role authenticated");
  assert.equal(
    (await q("select save_creator_preferences('9:16','bold') as saved")).rows[0]
      .saved,
    false,
  );
  assert.equal(
    (await q("update profiles set full_name='Not edited' where id=$1", [owner]))
      .rowCount,
    0,
  );
  await q("reset role; set role anon");
  await assert.rejects(q("select * from get_credit_wallet()"), {
    code: "42501",
  });
  console.log(
    "PostgreSQL migration, RLS, exact purchase, overspend race, settlement, and audited adjustment checks passed.",
  );
} finally {
  await Promise.all(clients.map((c) => c.end()));
  if (started) await db.stop();
  await rm(work, { recursive: true, force: true });
}
