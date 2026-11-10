/**
 * @license
 * Copyright 2026 ideaman's Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

// ideamans fork: the version is `<upstream version>-i.<n>`, e.g. 1.12.0-i.1.
// The upstream version is read from .release-please-manifest.json, which the
// fork never edits, so after rebasing onto upstream it names the upstream
// release the branch is built on.
//
// usage:
//   node scripts/ideamans-version.mjs check   # package.json, package-lock.json and
//                                             # src/version.ts agree and follow the scheme
//   node scripts/ideamans-version.mjs bump    # next -i.<n> (back to -i.1 when upstream moved)
//   node scripts/ideamans-version.mjs set <n> # <upstream version>-i.<n>
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const file = name => path.join(root, name);
const readJson = name => JSON.parse(fs.readFileSync(file(name), 'utf8'));
const writeJson = (name, data) =>
  fs.writeFileSync(file(name), JSON.stringify(data, null, 2) + '\n');

const VERSION_TS = 'src/version.ts';
const VERSION_RE = /export const VERSION = '([^']*)';/;
const SCHEME_RE = /^(\d+\.\d+\.\d+)-i\.(\d+)$/;

function upstreamVersion() {
  return readJson('.release-please-manifest.json')['.'];
}

function current() {
  const pkg = readJson('package.json').version;
  const lock = readJson('package-lock.json');
  const ts = fs.readFileSync(file(VERSION_TS), 'utf8').match(VERSION_RE)?.[1];
  return {pkg, lock: lock.version, lockRoot: lock.packages[''].version, ts};
}

function check() {
  const upstream = upstreamVersion();
  const v = current();
  const errors = [];
  const m = v.pkg.match(SCHEME_RE);
  if (!m) {
    errors.push(
      `package.json version ${v.pkg} is not <upstream>-i.<n> (e.g. ${upstream}-i.1)`,
    );
  } else if (m[1] !== upstream) {
    errors.push(
      `package.json version ${v.pkg} is not based on upstream ${upstream} (.release-please-manifest.json); run \`node scripts/ideamans-version.mjs bump\``,
    );
  }
  for (const [where, value] of [
    ['package-lock.json version', v.lock],
    ['package-lock.json packages[""].version', v.lockRoot],
    [`${VERSION_TS} VERSION`, v.ts],
  ]) {
    if (value !== v.pkg) {
      errors.push(`${where} is ${value}, not ${v.pkg}`);
    }
  }
  if (errors.length) {
    for (const error of errors) {
      console.error(`::error::${error}`);
    }
    process.exit(1);
  }
  console.log(`OK: ${v.pkg} (upstream ${upstream})`);
}

function set(version) {
  const pkg = readJson('package.json');
  pkg.version = version;
  writeJson('package.json', pkg);
  const lock = readJson('package-lock.json');
  lock.version = version;
  lock.packages[''].version = version;
  writeJson('package-lock.json', lock);
  const ts = fs.readFileSync(file(VERSION_TS), 'utf8');
  if (!VERSION_RE.test(ts)) {
    throw new Error(`VERSION not found in ${VERSION_TS}`);
  }
  fs.writeFileSync(
    file(VERSION_TS),
    ts.replace(VERSION_RE, `export const VERSION = '${version}';`),
  );
  console.log(version);
}

const [command, arg] = process.argv.slice(2);
switch (command) {
  case 'check':
    check();
    break;
  case 'set': {
    if (!/^\d+$/.test(arg ?? '') || Number(arg) < 1) {
      console.error('usage: node scripts/ideamans-version.mjs set <n>');
      process.exit(2);
    }
    set(`${upstreamVersion()}-i.${Number(arg)}`);
    break;
  }
  case 'bump': {
    const upstream = upstreamVersion();
    const m = current().pkg.match(SCHEME_RE);
    const n = m && m[1] === upstream ? Number(m[2]) + 1 : 1;
    set(`${upstream}-i.${n}`);
    break;
  }
  default:
    console.error(
      'usage: node scripts/ideamans-version.mjs check | bump | set <n>',
    );
    process.exit(2);
}
