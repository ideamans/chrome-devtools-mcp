/**
 * @license
 * Copyright 2026 ideaman's Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

// ideamans fork: start the packed MCP server over stdio and check that it
// answers tools/list with performance_analyze_file. Guards against publishing
// a tarball that cannot start (0.21.0 lacked bundled modules).
//
// usage: node scripts/ideamans-smoke.mjs <path to chrome-devtools-mcp bin>
import {spawn} from 'node:child_process';

const bin = process.argv[2];
const server = spawn(
  process.execPath,
  [bin, '--headless', '--isolated', '--no-usage-statistics'],
  {
    stdio: ['pipe', 'pipe', 'inherit'],
  },
);
const timer = setTimeout(() => {
  console.error('Timed out waiting for the MCP server.');
  server.kill();
  process.exit(1);
}, 60_000);

let buffer = '';
const pending = new Map();
server.stdout.on('data', chunk => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    if (!line.trim()) {
      continue;
    }
    const message = JSON.parse(line);
    pending.get(message.id)?.(message);
  }
});
server.on('exit', code => {
  console.error(`The MCP server exited early with code ${code}.`);
  process.exit(1);
});

let nextId = 0;
function request(method, params) {
  return new Promise(resolve => {
    const id = ++nextId;
    pending.set(id, resolve);
    server.stdin.write(
      JSON.stringify({jsonrpc: '2.0', id, method, params}) + '\n',
    );
  });
}

await request('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: {name: 'ideamans-smoke', version: '0'},
});
server.stdin.write(
  JSON.stringify({jsonrpc: '2.0', method: 'notifications/initialized'}) + '\n',
);
const list = await request('tools/list', {});
const names = list.result.tools.map(tool => tool.name);
clearTimeout(timer);
server.removeAllListeners('exit');
server.kill();
if (!names.includes('performance_analyze_file')) {
  console.error(`performance_analyze_file is missing: ${names.join(', ')}`);
  process.exit(1);
}
console.log(`OK: ${names.length} tools including performance_analyze_file`);
