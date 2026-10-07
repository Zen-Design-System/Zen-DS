// A zip file without compression (Studio builder GĐ5, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3c):
// the HTML export and the handoff package, written in the browser with no dependency. Store only (method 0): photos are
// compressed already and the text files are small. Names are UTF-8 (flag bit 11). Isomorphic (browser and Node).
//
//   zipFiles([{ path, data: string | Uint8Array, date? }]) → Uint8Array
//   unzipFiles(bytes) → [{ path, data: Uint8Array }]   (reads what zipFiles writes: tests, E2E)

const encoder = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (the zip's checksum) of `bytes`. */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS time and date of `date` (local time, two-second steps; 1980 at the earliest). */
function dosTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** The zip of `files` (paths with "/" folders, no leading "/"); a later file with the same path replaces the earlier. */
export function zipFiles(files, { date = new Date() } = {}) {
  const unique = new Map();
  for (const file of files) unique.set(String(file.path).replace(/^\/+/, ""), file);
  const entries = [...unique].map(([path, file]) => {
    const name = encoder.encode(path);
    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    return { name, data, crc: crc32(data), stamp: dosTime(file.date ?? date) };
  });
  const localSize = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.data.length, 0);
  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.name.length, 0);
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let offset = 0;
  const offsets = [];
  for (const entry of entries) {
    offsets.push(offset);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 10, true); // version needed: 1.0 (stored)
    view.setUint16(offset + 6, 0x0800, true); // UTF-8 names
    view.setUint16(offset + 8, 0, true); // stored
    view.setUint16(offset + 10, entry.stamp.time, true);
    view.setUint16(offset + 12, entry.stamp.date, true);
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.data.length, true);
    view.setUint32(offset + 22, entry.data.length, true);
    view.setUint16(offset + 26, entry.name.length, true);
    view.setUint16(offset + 28, 0, true);
    out.set(entry.name, offset + 30);
    out.set(entry.data, offset + 30 + entry.name.length);
    offset += 30 + entry.name.length + entry.data.length;
  }
  const centralStart = offset;
  entries.forEach((entry, index) => {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 0x031e, true); // made by: Unix, 3.0
    view.setUint16(offset + 6, 10, true);
    view.setUint16(offset + 8, 0x0800, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, entry.stamp.time, true);
    view.setUint16(offset + 14, entry.stamp.date, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.data.length, true);
    view.setUint32(offset + 24, entry.data.length, true);
    view.setUint16(offset + 28, entry.name.length, true);
    view.setUint16(offset + 30, 0, true); // extra
    view.setUint16(offset + 32, 0, true); // comment
    view.setUint16(offset + 34, 0, true); // disk
    view.setUint16(offset + 36, 0, true); // internal attributes
    view.setUint32(offset + 38, (0o100644 << 16) >>> 0, true); // a regular file, rw-r--r--
    view.setUint32(offset + 42, offsets[index], true);
    out.set(entry.name, offset + 46);
    offset += 46 + entry.name.length;
  });
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, offset - centralStart, true);
  view.setUint32(offset + 16, centralStart, true);
  return out;
}

/** The files of a stored zip (what zipFiles writes), by its central directory. */
export function unzipFiles(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error("not a zip file");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const files = [];
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("broken central directory");
    if (view.getUint16(offset + 10, true) !== 0) throw new Error("only stored entries are read");
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extra = view.getUint16(offset + 30, true);
    const comment = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const path = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    files.push({ path, data: bytes.slice(start, start + size) });
    offset += 46 + nameLength + extra + comment;
  }
  return files;
}
