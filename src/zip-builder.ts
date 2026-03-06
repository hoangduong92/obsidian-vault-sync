// Minimal ZIP archive builder using only Node.js built-ins (no external deps)
// Uses STORE method (no compression) for simplicity and speed

export function createZip(files: { path: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  const centralDir: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.path, 'utf-8');
    // Local file header (30 bytes + name + data)
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(0, 8);           // compression: STORE
    local.writeUInt16LE(0, 10);          // mod time
    local.writeUInt16LE(0, 12);          // mod date
    local.writeUInt32LE(crc32(file.data), 14); // crc32
    local.writeUInt32LE(file.data.length, 18); // compressed size
    local.writeUInt32LE(file.data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBytes.length, 26); // name length
    local.writeUInt16LE(0, 28);                // extra length

    parts.push(local, nameBytes, file.data);

    // Central directory entry (46 bytes + name)
    const cdir = Buffer.alloc(46);
    cdir.writeUInt32LE(0x02014b50, 0);  // signature
    cdir.writeUInt16LE(20, 4);           // version made by
    cdir.writeUInt16LE(20, 6);           // version needed
    cdir.writeUInt16LE(0, 8);            // flags
    cdir.writeUInt16LE(0, 10);           // compression: STORE
    cdir.writeUInt16LE(0, 12);           // mod time
    cdir.writeUInt16LE(0, 14);           // mod date
    cdir.writeUInt32LE(crc32(file.data), 16); // crc32
    cdir.writeUInt32LE(file.data.length, 20); // compressed size
    cdir.writeUInt32LE(file.data.length, 24); // uncompressed size
    cdir.writeUInt16LE(nameBytes.length, 28); // name length
    cdir.writeUInt16LE(0, 30);           // extra length
    cdir.writeUInt16LE(0, 32);           // comment length
    cdir.writeUInt16LE(0, 34);           // disk number
    cdir.writeUInt16LE(0, 36);           // internal attrs
    cdir.writeUInt32LE(0, 38);           // external attrs
    cdir.writeUInt32LE(offset, 42);      // local header offset

    centralDir.push(cdir, nameBytes);
    offset += 30 + nameBytes.length + file.data.length;
  }

  // End of central directory (22 bytes)
  const cdirSize = centralDir.reduce((s, b) => s + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);      // signature
  eocd.writeUInt16LE(0, 4);                // disk number
  eocd.writeUInt16LE(0, 6);                // cdir disk
  eocd.writeUInt16LE(files.length, 8);     // entries on disk
  eocd.writeUInt16LE(files.length, 10);    // total entries
  eocd.writeUInt32LE(cdirSize, 12);        // cdir size
  eocd.writeUInt32LE(offset, 16);          // cdir offset
  eocd.writeUInt16LE(0, 20);              // comment length

  return Buffer.concat([...parts, ...centralDir, eocd]);
}

// CRC-32 implementation
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
