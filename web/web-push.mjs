/** Minimal standards-based Web Push (RFC 8291 + RFC 8292), Node 22, no npm dependencies. */
import {
  createECDH,
  createHmac,
  createCipheriv,
  createPrivateKey,
  randomBytes,
  sign,
  createHash,
} from "node:crypto";
const b64 = (b) => Buffer.from(b).toString("base64url");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();
const txt = (s) => Buffer.from(s, "utf8");
const err = (m) => Object.assign(new Error(m), { status: 400 });
export function safePushEndpoint(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw err("Invalid push endpoint");
  }
  const host = url.hostname.toLowerCase();
  const allowed =
    host === "fcm.googleapis.com" ||
    host === "web.push.apple.com" ||
    host === "push.services.mozilla.com" ||
    host.endsWith(".push.services.mozilla.com") ||
    host.endsWith(".push.apple.com");
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !allowed ||
    raw.length > 2048
  )
    throw err("Push service is not on the allowlist");
  return url.href;
}
export function validateSubscription(value) {
  if (!value || typeof value !== "object") throw err("Invalid subscription");
  const endpoint = safePushEndpoint(value.endpoint);
  const publicKey = Buffer.from(value.keys?.p256dh || "", "base64url"),
    auth = Buffer.from(value.keys?.auth || "", "base64url");
  if (publicKey.length !== 65 || publicKey[0] !== 4 || auth.length !== 16)
    throw err("Invalid Web Push subscription keys");
  return { endpoint, keys: { p256dh: b64(publicKey), auth: b64(auth) } };
}
export function vapidPublicPrivate(env = process.env) {
  const pub = Buffer.from(env.ATELIER_VAPID_PUBLIC_KEY || "", "base64url");
  const priv = Buffer.from(env.ATELIER_VAPID_PRIVATE_KEY || "", "base64url");
  if (pub.length !== 65 || pub[0] !== 4 || priv.length !== 32) return null;
  if (!/^(mailto:|https:\/\/)/.test(env.ATELIER_VAPID_SUBJECT || "")) return null;
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(priv);
  if (!ecdh.getPublicKey().equals(pub)) throw Error("VAPID private and public keys do not match");
  return { publicKey: pub, privateKey: priv, subject: env.ATELIER_VAPID_SUBJECT };
}
export function encryptPush(subscription, message, { salt = randomBytes(16), privateKey } = {}) {
  const sub = validateSubscription(subscription),
    uaPub = Buffer.from(sub.keys.p256dh, "base64url"),
    auth = Buffer.from(sub.keys.auth, "base64url");
  const ecdh = createECDH("prime256v1");
  if (privateKey) ecdh.setPrivateKey(privateKey);
  else ecdh.generateKeys();
  const senderPub = ecdh.getPublicKey(),
    shared = ecdh.computeSecret(uaPub);
  const keyInfo = Buffer.concat([txt("WebPush: info"), Buffer.from([0]), uaPub, senderPub]);
  const ikm = hmac(hmac(auth, shared), Buffer.concat([keyInfo, Buffer.from([1])]));
  const prk = hmac(salt, ikm),
    expand = (info, size) =>
      hmac(prk, Buffer.concat([txt(info), Buffer.from([0, 1])])).subarray(0, size);
  const cek = expand("Content-Encoding: aes128gcm", 16),
    nonce = expand("Content-Encoding: nonce", 12);
  const plaintext = Buffer.concat([txt(JSON.stringify(message)), Buffer.from([2])]);
  if (plaintext.length > 3900) throw err("Push message too long");
  const cipher = createCipheriv("aes-128-gcm", cek, nonce),
    encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header[20] = senderPub.length;
  return Buffer.concat([header, senderPub, encrypted]);
}
export function vapidAuth(url, config, now = Date.now()) {
  const origin = new URL(safePushEndpoint(url)).origin;
  const jwtHead = b64(txt(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const jwtPayload = b64(
    txt(JSON.stringify({ aud: origin, exp: Math.floor(now / 1000) + 3600, sub: config.subject })),
  );
  const claim = jwtHead + "." + jwtPayload;
  const pub = config.publicKey;
  const key = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: b64(pub.subarray(1, 33)),
      y: b64(pub.subarray(33, 65)),
      d: b64(config.privateKey),
    },
    format: "jwk",
  });
  const signature = sign("sha256", Buffer.from(claim), { key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${claim}.${b64(signature)}, k=${b64(pub)}`;
}
export const subscriptionId = (subscription) =>
  createHash("sha256")
    .update(validateSubscription(subscription).endpoint)
    .digest("hex")
    .slice(0, 32);
export async function sendWebPush(subscription, message, config, { fetchImpl = fetch } = {}) {
  const sub = validateSubscription(subscription);
  if (!config) throw Error("Web Push VAPID is not configured");
  const payload = encryptPush(sub, message),
    controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidAuth(sub.endpoint, config),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "3600",
        Urgency: "high",
      },
      body: payload,
      redirect: "manual",
      signal: controller.signal,
    });
    return {
      accepted: response.status === 201 || response.status === 202,
      expired: response.status === 404 || response.status === 410,
      status: response.status,
    };
  } finally {
    clearTimeout(timeout);
  }
}
