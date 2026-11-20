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
  await q("update profiles set onboarding_completed=true where id=$1", [owner]);
  async function quote(duration) {
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
      "insert into generation_quotes(id,user_id,project_id,settings,required_credits,expires_at) values($1,$2,$3,$4,$5,now()+interval '5 minutes')",
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
      ],
    );
    return quote;
  }
  const quotes = [await quote(4800), await quote(4800)];
  const params = quotes.map((x) => [owner, x, id()]);
  const reserve = "select reserve_generation_credits($1,$2,$3) as job";
  const results = await Promise.allSettled(
    [a, b].map((x, i) => x.query(reserve, params[i])),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const win = results.findIndex((r) => r.status === "fulfilled");
  const job = results[win].value.rows[0].job;
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
