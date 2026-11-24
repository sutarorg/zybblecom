import assert from "node:assert/strict";
import { test } from "node:test";
import sitemap from "../../src/app/sitemap";
import { legalLinks, supportEmail } from "../../src/config/legal";
import { marketingMetadata } from "../../src/lib/seo/metadata";
import { site } from "../../src/config/site";

test("public legal paths share the canonical production origin and are not hidden from search", () => {
  assert.deepEqual(
    legalLinks.map(({ href }) => href),
    ["/terms", "/privacy", "/refund-policy"],
  );
  for (const { href } of legalLinks) {
    const url = `${site.url}${href}`;
    const metadata = marketingMetadata(href);
    assert.equal(metadata.alternates?.canonical, url);
    assert.equal((metadata.openGraph as { url: string }).url, url);
    assert.equal(metadata.robots, undefined);
    assert.equal(sitemap().filter((entry) => entry.url === url).length, 1);
  }
  assert.match(supportEmail, /^[^\s@]+@[^\s@]+$/);
});
