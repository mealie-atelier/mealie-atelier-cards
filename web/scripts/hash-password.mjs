/**
 * Prints an ATELIER_USERS password hash. The password is read from stdin (never from argv, so it
 * stays out of the process list and shell history). On a terminal the input is not echoed.
 *
 *   npm run hash-password
 *   printf '%s' 'a long passphrase' | npm run --silent hash-password
 */
import { createInterface } from "node:readline";
import { hashPassword } from "../security.mjs";

const MIN_LENGTH = 12;

function readSecret(prompt) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data.replace(/\r?\n$/, "")));
      return;
    }
    const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    // Mute echo: the readline output hook swallows everything except the prompt itself.
    rl._writeToOutput = (text) => {
      if (text.includes(prompt)) process.stderr.write(text);
    };
    rl.question(prompt, (answer) => {
      process.stderr.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

const password = await readSecret("Password: ");
if (password.length < MIN_LENGTH) {
  console.error(`Use a password with at least ${MIN_LENGTH} characters.`);
  process.exit(1);
}
console.log(await hashPassword(password));
