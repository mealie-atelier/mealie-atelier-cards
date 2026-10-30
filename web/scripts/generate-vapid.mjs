import { createECDH } from "node:crypto";
const key = createECDH("prime256v1");
key.generateKeys();
console.log(`ATELIER_VAPID_PUBLIC_KEY=${key.getPublicKey().toString("base64url")}`);
console.log(`ATELIER_VAPID_PRIVATE_KEY=${key.getPrivateKey().toString("base64url")}`);
console.log("ATELIER_VAPID_SUBJECT=mailto:you@example.com");
console.log("Keep the keys stable, private, and backed up. Never commit the private key.");
