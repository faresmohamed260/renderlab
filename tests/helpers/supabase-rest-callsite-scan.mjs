import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const suffix = new Set([".ts", ".tsx", ".mts", ".cts"]);
const slash = (value) => value.replaceAll("\\", "/");

function listSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSources(full);
    return entry.isFile() && suffix.has(path.extname(entry.name)) ? [full] : [];
  });
}

export function sourceCallSites(file, body, projectRoot = process.cwd()) {
  const relative = slash(path.relative(projectRoot, file));
  const ast = parse(body, {
    sourceType: "unambiguous",
    plugins: ["typescript", "jsx"],
    errorRecovery: false,
  });
  const sites = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression" && node.callee?.type === "Identifier"
      && node.callee.name === "supabaseRest") {
      const argument = node.arguments?.[0];
      let head = null;
      if (argument?.type === "StringLiteral") {
        head = argument.value;
      } else if (argument?.type === "TemplateLiteral") {
        head = argument.quasis[0]?.value?.cooked ?? null;
      }
      const prefix = typeof head === "string"
        ? head.match(/^(rpc\/)?[a-z][a-z0-9_]*/)?.[0] ?? null
        : null;
      const line = node.loc?.start.line;
      const column = node.loc?.start.column + 1;
      if (!Number.isInteger(line) || !Number.isInteger(column))
        throw new Error("AST call site has no source coordinates");
      sites.push({
        id: relative + ":" + line + ":" + column,
        file: relative, line, column,
        staticTableOrRpc: prefix,
        argument: argument ? body.slice(argument.start, argument.end).replace(/\s+/g, " ").slice(0, 130) : "",
      });
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "tokens" || key === "comments"
        || key === "extra" || key === "leadingComments" || key === "trailingComments") continue;
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === "object" && typeof child.type === "string") visit(child);
        }
      } else if (value && typeof value === "object" && typeof value.type === "string") {
        visit(value);
      }
    }
  }
  visit(ast);
  return sites;
}

export function scanPrivilegedCalls(projectRoot = process.cwd()) {
  const sourceRoot = path.join(projectRoot, "src/server");
  return listSources(sourceRoot)
    .flatMap((file) => sourceCallSites(file, fs.readFileSync(file, "utf8"), projectRoot))
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
}

export function compareRegisteredSites(discovered, registry) {
  const seen = new Set();
  const errors = [];
  const registered = new Map();
  const classes = new Set(["owner-scoped", "admin", "internal", "public"]);
  for (const row of registry) {
    if (!row || typeof row !== "object" || !row.id) {
      errors.push("Registry contains an entry without an ID");
      continue;
    }
    if (seen.has(row.id)) errors.push("Duplicate registry call site " + row.id);
    seen.add(row.id);
    if (!classes.has(row.classification)) errors.push("Invalid classification at " + row.id);
    for (const field of ["tableOrRpc", "principalDerivation", "family", "negativeHarness"]) {
      if (typeof row[field] !== "string" || row[field].trim().length < (field === "negativeHarness" ? 2 : 3))
        errors.push("Missing " + field + " at " + row.id);
    }
    registered.set(row.id, row);
  }
  const actual = new Map(discovered.map((site) => [site.id, site]));
  for (const site of discovered) {
    const entry = registered.get(site.id);
    if (!entry) {
      errors.push("Unregistered supabaseRest call site " + site.id + " (" + (site.staticTableOrRpc ?? "dynamic") + ")");
    } else if (site.staticTableOrRpc && entry.tableOrRpc !== site.staticTableOrRpc) {
      errors.push("Table/RPC drift at " + site.id + ": expected " + entry.tableOrRpc + ", actual " + site.staticTableOrRpc);
    }
  }
  for (const row of registry) if (row?.id && !actual.has(row.id)) {
    errors.push("Stale/moved registry entry " + row.id);
  }
  return errors;
}
