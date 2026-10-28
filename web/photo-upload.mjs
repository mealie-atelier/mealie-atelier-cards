/** Constrained raw-image upload with no data URL decoding inside the API proxy. */
export function sniffImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { type: "image/jpeg", ext: "jpg" };
  if (
    bytes.length >= 8 &&
    Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { type: "image/png", ext: "png" };
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return { type: "image/webp", ext: "webp" };
  throw Object.assign(new Error("Only JPEG, PNG and WebP images are accepted"), { status: 415 });
}
export async function limitedBody(req, maxBytes = 8 * 1024 * 1024) {
  const parts = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw Object.assign(new Error("Photo exceeds 8 MiB"), { status: 413 });
    parts.push(chunk);
  }
  if (total < 100) throw Object.assign(new Error("Empty or invalid photo"), { status: 400 });
  return Buffer.concat(parts);
}
