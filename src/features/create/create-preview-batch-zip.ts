// Store the already-compressed PNGs in a ZIP without recompressing or uploading them.
const crcTable = Uint32Array.from({ length: 256 }, (_, byte) => {
  for (let bit = 0; bit < 8; bit++) byte = (byte >>> 1) ^ ((byte & 1) ? 0xedb88320 : 0);
  return byte >>> 0;
});

export function buildImageBatchZip(images: readonly { image_data: string }[]) {
  if (images.length < 2 || images.length > 4) throw new Error("Invalid batch size.");
  const entries: BlobPart[] = [];
  const directory: BlobPart[] = [];
  const encoder = new TextEncoder();
  let offset = 0;
  let directorySize = 0;
  let encodedBytes = 0;
  for (const [index, image] of images.entries()) {
    const prefix = "data:image/png;base64,";
    encodedBytes += image.image_data.length;
    if (!image.image_data.startsWith(prefix) || encodedBytes > 17 * 1024 * 1024) throw new Error("Invalid batch image.");
    const bytes = Uint8Array.from(atob(image.image_data.slice(prefix.length)), (char) => char.charCodeAt(0));
    const name = encoder.encode("image-" + (index + 1) + ".png");
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
    crc = (crc ^ 0xffffffff) >>> 0;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(12, 33, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, bytes.length, true);
    local.setUint16(26, name.length, true);
    entries.push(local.buffer, name, bytes);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(14, 33, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, bytes.length, true);
    central.setUint32(24, bytes.length, true);
    central.setUint16(28, name.length, true);
    central.setUint32(42, offset, true);
    directory.push(central.buffer, name);
    directorySize += 46 + name.length;
    offset += 30 + name.length + bytes.length;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, images.length, true);
  end.setUint16(10, images.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);
  return new Blob([...entries, ...directory, end.buffer], { type: "application/zip" });
}
