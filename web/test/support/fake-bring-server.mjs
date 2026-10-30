/**
 * Runs the fake Bring! API for local runs: `node web/test/support/fake-bring-server.mjs [port]`. Set FAKE_BRING_EMAIL to accept another fictional address.
 * Sign in with cook@example.test and fixture-bring-password; start the web app with the printed
 * BRING_API_BASE and BRING_API_KEY. Fictional data only, never the real Bring! service.
 */
import { FAKE_API_KEY, FAKE_EMAIL, FAKE_PASSWORD, startFakeBring } from "../fake-bring.mjs";

export { FAKE_API_KEY, FAKE_EMAIL, FAKE_PASSWORD, startFakeBring };

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] || process.env.PORT || 0);
  const email = process.env.FAKE_BRING_EMAIL || FAKE_EMAIL;
  const fake = await startFakeBring({ port, email });
  console.log(`BRING_API_BASE=${fake.base}`);
  console.log(`BRING_API_KEY=${FAKE_API_KEY}`);
  console.log(`Sign in with ${email} / ${FAKE_PASSWORD}`);
  const stop = () => {
    fake.close();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
