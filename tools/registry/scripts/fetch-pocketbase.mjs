// Downloads the PocketBase binary the e2e test runs against into tools/registry/.bin (git-ignored).
// Usage: node scripts/fetch-pocketbase.mjs  → prints the binary path.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const POCKETBASE_VERSION = '0.39.11'; // the repo's pin (skills/pocketbase-backend)

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const binDir = join(root, '.bin', `pocketbase-${POCKETBASE_VERSION}`);
export const pocketbaseBin = join(binDir, 'pocketbase');

export async function fetchPocketBase() {
  if (existsSync(pocketbaseBin)) return pocketbaseBin;
  const os = { darwin: 'darwin', linux: 'linux' }[process.platform];
  const arch = { arm64: 'arm64', x64: 'amd64' }[process.arch];
  if (!os || !arch) throw new Error(`no PocketBase build for ${process.platform}/${process.arch}`);
  const file = `pocketbase_${POCKETBASE_VERSION}_${os}_${arch}.zip`;
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
  mkdirSync(binDir, { recursive: true });
  const zip = join(binDir, file);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-o', '-q', zip, 'pocketbase', '-d', binDir]);
  return pocketbaseBin;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(await fetchPocketBase());
}
