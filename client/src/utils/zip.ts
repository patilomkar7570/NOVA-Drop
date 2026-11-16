/**
 * Lightweight, zero-dependency in-browser uncompressed ZIP archive generator.
 * Packages multiple files and entire nested directory structures into a single standard .zip file.
 * Compatible with Windows File Explorer, macOS Archive Utility, iOS Files, Linux unzip, and Android.
 */

// CRC-32 Lookup Table
const crcTable: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  path: string; // e.g. "my-agent/index.ts" or "notes.pdf"
  data: Uint8Array;
}

export function createZipArchive(files: ZipFileInput[]): Blob {
  const textEncoder = new TextEncoder();
  const fileRecords: Array<{
    pathBytes: Uint8Array;
    crc32: number;
    size: number;
    offset: number;
  }> = [];

  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  // 1. Write Local File Headers + File Data
  for (const file of files) {
    const cleanPath = file.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const pathBytes = textEncoder.encode(cleanPath);
    const crc = computeCrc32(file.data);
    const size = file.data.length;

    const localHeader = new Uint8Array(30 + pathBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true);         // Version needed (2.0)
    view.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8 filenames)
    view.setUint16(8, 0, true);          // Compression: Store (0)
    view.setUint16(10, 0, true);         // Mod time
    view.setUint16(12, 0, true);         // Mod date
    view.setUint32(14, crc, true);        // CRC-32
    view.setUint32(18, size, true);       // Compressed size
    view.setUint32(22, size, true);       // Uncompressed size
    view.setUint16(26, pathBytes.length, true); // Filename length
    view.setUint16(28, 0, true);          // Extra field length

    localHeader.set(pathBytes, 30);

    chunks.push(localHeader);
    chunks.push(file.data);

    fileRecords.push({
      pathBytes,
      crc32: crc,
      size,
      offset: currentOffset,
    });

    currentOffset += localHeader.length + file.data.length;
  }

  // 2. Write Central Directory Headers
  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  for (const record of fileRecords) {
    const cdHeader = new Uint8Array(46 + record.pathBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory signature
    view.setUint16(4, 20, true);         // Version made by (2.0)
    view.setUint16(6, 20, true);         // Version needed (2.0)
    view.setUint16(8, 0x0800, true);     // Flags (UTF-8)
    view.setUint16(10, 0, true);         // Compression: Store
    view.setUint16(12, 0, true);         // Mod time
    view.setUint16(14, 0, true);         // Mod date
    view.setUint32(16, record.crc32, true);
    view.setUint32(20, record.size, true); // Compressed size
    view.setUint32(24, record.size, true); // Uncompressed size
    view.setUint16(28, record.pathBytes.length, true);
    view.setUint16(30, 0, true);         // Extra field length
    view.setUint16(32, 0, true);         // Comment length
    view.setUint16(34, 0, true);         // Disk number start
    view.setUint16(36, 0, true);         // Internal attributes
    view.setUint32(38, 0, true);         // External attributes
    view.setUint32(42, record.offset, true); // Local header offset

    cdHeader.set(record.pathBytes, 46);

    chunks.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Number of this disk
  eocdView.setUint16(6, 0, true);          // Disk where central directory starts
  eocdView.setUint16(8, fileRecords.length, true);  // Records on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total records
  eocdView.setUint32(12, centralDirSize, true);     // Central directory size
  eocdView.setUint32(16, centralDirStart, true);    // Offset of central directory
  eocdView.setUint16(20, 0, true);         // Comment length

  chunks.push(eocd);

  return new Blob(chunks as BlobPart[], { type: 'application/zip' });
}
