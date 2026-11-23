import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
export const targets=[
  [
    "src/server/admin/admin-operations.ts",
    65
  ],
  [
    "src/server/account/account-data-lifecycle.ts",
    45
  ],
  [
    "src/server/account/account-sessions.ts",
    85
  ],
  [
    "src/server/account/account-profile-request.ts",
    90
  ],
  [
    "src/server/media/reference-uploads.ts",
    65
  ],
  [
    "src/server/account/account-deletion-notification.ts",
    95
  ],
  [
    "src/server/observability/diagnostics.ts",
    90
  ],
  [
    "src/app/api/media/assets/batch-delete/route.ts",
    95
  ],
  [
    "src/app/api/media/assets/[assetId]/download/route.ts",
    95
  ],
  [
    "src/app/api/media/uploads/upload-tickets/route.ts",
    95
  ],
  [
    "src/app/api/media/uploads/upload-completions/route.ts",
    95
  ],
  [
    "src/app/api/account/data-export/download/route.ts",
    95
  ]
];
const summary=JSON.parse(readFileSync("coverage/coverage-summary.json","utf8"));
const output=targets.map(([path,lineTarget])=>{
 const key=Object.keys(summary).find(x=>x.replaceAll("\\","/").endsWith("/"+path));
 assert.ok(key,"Missing audited module "+path);
 const {lines,branches}=summary[key];
 return {path,lineTarget,lines:{covered:lines.covered,total:lines.total,pct:lines.pct},branches:{covered:branches.covered,total:branches.total,pct:branches.pct},targetMet:lines.pct>=lineTarget};
});
console.log("W4C_MODULE_COVERAGE="+JSON.stringify(output));