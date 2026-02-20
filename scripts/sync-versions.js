#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const version = process.argv[2];

if (!version) {
  console.error("Usage: node scripts/sync-versions.js <version>");
  process.exit(1);
}

const packages = ["packages/backend/package.json", "packages/frontend/package.json", "packages/shared/package.json"];

for (const pkgPath of packages) {
  const fullPath = join(process.cwd(), pkgPath);
  const pkg = JSON.parse(readFileSync(fullPath, "utf-8"));
  pkg.version = version;
  writeFileSync(fullPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`Updated ${pkgPath} to ${version}`);
}
