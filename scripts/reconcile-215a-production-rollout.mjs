import fs from 'node:fs';

function replaceOnce(path, oldText, newText) {
  const text = fs.readFileSync(path, 'utf8');
  const count = text.split(oldText).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly one match in ${path}; found ${count}: ${oldText.slice(0, 140)}`);
  }
  fs.writeFileSync(path, text.replace(oldText, newText));
}

replaceOnce(
  'PROJECT.md',
  '- This repository-side work is **not deployed**. Production remains the completed UI redesign source `b6deedad8a229b34828da0c3760b62fa147c1981` / READY deployment `dpl_CB145taZqMd6r7MqAoMweYTJzmvh` until hosted Auth policy and repository policy are explicitly coordinated and a separate deployment is authorized.',
  '- The repository-side #215A policy is now **production-live**. Explicit guarded rollout `34865097038` deployed exact source `27eda7ed0a619435b9d89531bdeb3fffe772e803` as READY Vercel deployment `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7` and moved `renderlab.faresuniform.uk` after exact-source, build and route-smoke checks. The prior redesign deployment `dpl_CB145taZqMd6r7MqAoMweYTJzmvh` remains the immediate known-good rollback target.'
);

replaceOnce(
  'PROJECT.md',
  '- Security Advisor shows no new findings. `auth_leaked_password_protection` remains the explicit #215B blocker because the organization is still on Free and leaked-password protection requires Pro+. CAPTCHA remains evaluated/deferred. Repository-side 15-character guidance is still **not deployed**, so production application deployment remains the next separate authorization gate before presentation and hosted policy are fully synchronized.',
  '- Security Advisor shows no new findings. `auth_leaked_password_protection` remains the explicit #215B blocker because the organization is still on Free and leaked-password protection requires Pro+. CAPTCHA remains evaluated/deferred. Hosted policy and production presentation are now synchronized at the 15-character minimum; post-cutover Vercel checks found no runtime-error clusters and no error/fatal logs for the new deployment.'
);

replaceOnce(
  'docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md',
  '**Current execution:** #215A current-plan hardening is complete and verified: repository policy merged as `8ea859df84f5173267defbf3e278a95bba403014`, hosted Auth minimum is 15, security notifications/templates are branded, configured acceptance passed, and #215B leaked-password protection remains the explicit Supabase Pro+ plan gate. Repository policy presentation is not yet deployed.',
  '**Current execution:** #215A current-plan hardening is complete, verified and production-live: repository policy merged as `8ea859df84f5173267defbf3e278a95bba403014`, hosted Auth minimum is 15, security notifications/templates are branded, configured acceptance passed, and exact application source `27eda7ed0a619435b9d89531bdeb3fffe772e803` is live as Vercel deployment `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7`. #215B leaked-password protection remains the explicit Supabase Pro+ plan gate.'
);

replaceOnce(
  'docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md',
  '**Status:** #215A CURRENT-PLAN HARDENING COMPLETE + VERIFIED / #215B PLAN-GATED / APPLICATION POLICY CODE NOT YET DEPLOYED',
  '**Status:** #215A CURRENT-PLAN HARDENING COMPLETE + VERIFIED + PRODUCTION-LIVE / #215B PLAN-GATED'
);

replaceOnce(
  'docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md',
  '- Repository policy code remains **not deployed**. Production application source is still the Phase 23–29 redesign deployment until a separate application deployment is authorized.\n- Hosted #215A configuration was subsequently executed and verified under the Stage 2 record below.',
  '- Repository policy code is now **production-live** through the separately authorized Stage 3 rollout recorded below.\n- Hosted #215A configuration was subsequently executed and verified under the Stage 2 record below.'
);

replaceOnce(
  'docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md',
  '\n## 3. Binding product/security decisions\n',
  `\n### Stage 3 application production rollout — completed and verified 2026-09-14\n\nExplicit user authorization deployed the already-merged #215A application policy through the repository's established guarded Vercel rollout pattern.\n\n- rollout workflow run \`34865097038\`, job \`104046825061\`, completed successfully;\n- exact pristine source guard checked out \`27eda7ed0a619435b9d89531bdeb3fffe772e803\`;\n- Vercel production deployment \`dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7\` / \`https://renderlab-apvh9ck6i-faresmohamed260-6733s-projects.vercel.app\` reached \`READY\` with exact Git metadata \`27eda7ed0a619435b9d89531bdeb3fffe772e803\`;\n- the production environment prebuild contract passed before Next.js compilation;\n- the workflow explicitly moved \`renderlab.faresuniform.uk\` to the new deployment;\n- custom-domain smoke passed for root, \`/create\`, \`/library\`, \`/activity\` and \`/settings\`, including the approved Landing identity markers;\n- rollback was not invoked; prior deployment \`dpl_CB145taZqMd6r7MqAoMweYTJzmvh\` remains the immediate known-good alias restoration target;\n- post-cutover Vercel audit found no error/fatal logs for the new deployment and no runtime-error clusters in the observed window;\n- automatic Git → Vercel deployment remains disabled.\n\nHosted Auth and the production application are therefore synchronized on the canonical 15-character password-creation/replacement policy. #215A is complete for the current Free plan. #215B remains independently gated on explicit authorization for a qualifying Supabase plan and leaked-password protection.\n\n## 3. Binding product/security decisions\n`
);

replaceOnce(
  'docs/architecture/INFRASTRUCTURE.md',
  '\n## Security Rules\n',
  `\n## #215A application production rollout — 2026-09-14\n\n- Explicit rollout run \`34865097038\` deployed exact repository source \`27eda7ed0a619435b9d89531bdeb3fffe772e803\` using the established pinned Vercel CLI production workflow.\n- READY production deployment: \`dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7\` (\`renderlab-apvh9ck6i-faresmohamed260-6733s-projects.vercel.app\`). Vercel Git metadata matches the exact candidate SHA.\n- \`renderlab.faresuniform.uk\` was explicitly aliased only after the production deploy completed. Root, Create, Library, Activity and Settings smoke passed after cutover.\n- Post-cutover Vercel audit found no error/fatal runtime logs for the deployment and no runtime-error clusters in the observed window. Rollback was not required.\n- Prior production deployment \`dpl_CB145taZqMd6r7MqAoMweYTJzmvh\` remains the immediate known-good alias rollback target.\n- This rollout changed no Supabase schema/RLS, Auth configuration, R2 contract, worker/provider routing, scheduler or secret inventory. Hosted #215A Auth configuration had already been separately applied and verified before this application rollout.\n- Automatic Git → Vercel deployment remains disabled; future production releases still require explicit authorization.\n\n## Security Rules\n`
);

for (const path of [
  'PROJECT.md',
  'docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md',
  'docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md',
  'docs/architecture/INFRASTRUCTURE.md',
]) {
  const text = fs.readFileSync(path, 'utf8');
  if (/\r/.test(text)) throw new Error(`CRLF introduced in ${path}`);
}
