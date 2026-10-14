#!/usr/bin/env node
'use strict';

/**
 * Prints the registry's usage per license for a month: developers (seats used), CI tokens, client IPs, installs.
 * On the server:
 *   podman exec zen-registry node /verdaccio/plugins/verdaccio-zen-license/usage-report.js [YYYY-MM] [file]
 * Many IPs for few developers, or one CI token from many places, is the pattern a shared key leaves.
 */

const { readJson } = require('./state');

const file = process.argv[3] || '/verdaccio/storage/zen-usage.json';
const data = readJson(file, null);
if (!data) {
  console.error(`no usage file at ${file}`);
  process.exit(1);
}
const month = process.argv[2] || Object.keys(data).sort().at(-1);
const rows = Object.entries(data[month] || {}).map(([license, u]) => ({
  license,
  developers: Object.keys(u.users).length,
  ciTokens: Object.keys(u.ci).length,
  ips: Object.keys(u.ips).length,
  installs: u.installs,
  requests: u.requests,
  last: u.last,
}));
rows.sort((a, b) => b.ips - a.ips || b.installs - a.installs);
console.log(`Usage for ${month || '(none)'} from ${file}`);
console.table(rows);
