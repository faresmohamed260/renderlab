import test from "node:test";
import assert from "node:assert/strict";
import { emailChangeLink, htmlDecode, scannerSafeConfirmation } from "../lib/email-change-verifier-link.mjs";

const valid = "https://renderlab.faresuniform.uk/auth/confirm?type=email_change&amp;token_hash=fixture";
const link = (href) => emailChangeLink(`<a href="${href}">Confirm</a>`);

test("email HTML entities are decoded exactly once", () => {
  assert.equal(htmlDecode("&amp;quot;&amp;lt;&amp;#39;"), "&quot;&lt;&#39;");
  assert.equal(link(valid).tokenHash, "fixture");
  assert.equal(scannerSafeConfirmation(link(valid)), true);
  assert.equal(scannerSafeConfirmation(link(valid.replace("&amp;", "&amp;amp;"))), false);
});

test("confirmation tokens are accepted only at the unambiguous RenderLab boundary", () => {
  for (const href of [
    valid.replace("renderlab.faresuniform.uk", "example.com"),
    valid.replace("/auth/confirm", "/auth/other"),
    valid.replace("token_hash", "token"),
    valid + "&amp;token_hash=other",
    valid + "&amp;token=other",
    valid + "&amp;type=email_change",
  ]) assert.equal(scannerSafeConfirmation(link(href)), false);
});
