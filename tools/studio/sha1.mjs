// SHA-1 of a string's UTF-8 bytes as lowercase hex, without node:crypto, so the Studio edit engine (file hashes, stale
// checks) runs in the browser too (GĐ2 2a). Equal to createHash("sha1").update(text, "utf8").digest("hex"); checked in
// engine-iso.selftest.mjs.

const encoder = new TextEncoder();
const rotl = (value, count) => (value << count) | (value >>> (32 - count));

export function sha1(text) {
  const bytes = encoder.encode(String(text));
  const length = bytes.length;
  // Padding: 0x80, zeros, then the bit length as a 64-bit big-endian number.
  const total = (((length + 9 + 63) >> 6) << 6);
  const block = new Uint8Array(total);
  block.set(bytes);
  block[length] = 0x80;
  const bits = length * 8;
  const view = new DataView(block.buffer);
  view.setUint32(total - 8, Math.floor(bits / 0x100000000), false);
  view.setUint32(total - 4, bits >>> 0, false);
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let offset = 0; offset < total; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 80; i += 1) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i += 1) {
      const [f, k] = i < 20 ? [(b & c) | (~b & d), 0x5a827999] : i < 40 ? [b ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30) >>> 0; b = a; a = temp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((word) => word.toString(16).padStart(8, "0")).join("");
}
