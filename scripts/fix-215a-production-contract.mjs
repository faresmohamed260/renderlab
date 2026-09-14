import fs from 'node:fs';

const path = 'docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md';
const oldText = '#215A is therefore **implementation-complete and verified for the current Free plan**. #215 remains open only for the separately authorized #215B plan/billing decision and leaked-password-protection closure. The repository-side 15-character application guidance is merged but still requires a separately authorized production application deployment before hosted policy and production presentation are fully synchronized.';
const newText = '#215A is therefore **implementation-complete, verified and production-live for the current Free plan**. #215 remains open only for the separately authorized #215B plan/billing decision and leaked-password-protection closure. Hosted policy and production application presentation are synchronized on the canonical 15-character minimum.';
const text = fs.readFileSync(path, 'utf8');
const count = text.split(oldText).length - 1;
if (count !== 1) throw new Error(`Expected one stale closure sentence, found ${count}`);
fs.writeFileSync(path, text.replace(oldText, newText));
