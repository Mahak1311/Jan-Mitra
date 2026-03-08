/**
 * Generates simple PNG icon files for the JanMitra PWA
 * Run: node icons/generate.js
 * Uses only built-in Node.js modules (zlib + fs)
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPNG(size, bgColor, fgColor) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const typeB = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.concat([typeB, data]);
    const crc = crc32(crcBuf);
    const crcOut = Buffer.alloc(4); crcOut.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeB, data, crcOut]);
  }

  // CRC32 implementation
  const table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return crc ^ 0xFFFFFFFF;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const [br, bg, bb] = bgColor;
  const [fr, fg, fb] = fgColor;

  // Build raw pixel data with a simple "JM" design
  const rows = [];
  const cx = size / 2, cy = size / 2, r = size / 2;
  const innerR = size * 0.41;
  const textSize = size * 0.31;
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) {
        row.push(br, bg, bb); // transparent as bg — but PNG RGB has no alpha, use bg
      } else if (dist > innerR) {
        row.push(br, bg, bb); // outer ring = brand orange
      } else {
        row.push(250, 246, 240); // cream inner
      }
    }
    rows.push(Buffer.from(row));
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 6 });
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend]);
}

// Generate icons
const sizes = [192, 512];
const outDir = __dirname;

for (const size of sizes) {
  const png = createPNG(size, [212, 97, 26], [12, 35, 64]);
  const outFile = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outFile, png);
  console.log(`Created ${outFile} (${png.length} bytes)`);
}

// Maskable (same image — safe zone is center 80%)
const maskable = createPNG(512, [212, 97, 26], [12, 35, 64]);
fs.writeFileSync(path.join(outDir, 'icon-maskable.png'), maskable);
console.log('Created icon-maskable.png');

console.log('Done! PWA icons generated.');
