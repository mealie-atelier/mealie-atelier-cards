import { sendWebPush, vapidPublicPrivate } from "./web-push.mjs";
export function getHomeAssistantConfig(env = process.env) {
  if (!env.ATELIER_HA_URL || !env.ATELIER_HA_TOKEN || !env.ATELIER_HA_NOTIFY_SERVICE) return null;
  let url;
  try {
    url = new URL(env.ATELIER_HA_URL);
  } catch {
    throw Error("ATELIER_HA_URL must be an http(s) URL without credentials or query.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error("ATELIER_HA_URL must be an http(s) URL without credentials or query.");
  if (!/^notify\.[a-z0-9_]+$/i.test(env.ATELIER_HA_NOTIFY_SERVICE))
    throw Error("Invalid HA notify service");
  return {
    url: url.origin + url.pathname.replace(/\/$/, ""),
    token: env.ATELIER_HA_TOKEN,
    service: env.ATELIER_HA_NOTIFY_SERVICE,
  };
}
/** Rejects half-set or malformed notification settings with one clear line each. */
export function validateNotificationEnv(env = process.env) {
  const set = (names) => names.filter((n) => env[n]);
  const vapid = ["ATELIER_VAPID_PUBLIC_KEY", "ATELIER_VAPID_PRIVATE_KEY", "ATELIER_VAPID_SUBJECT"];
  const ha = ["ATELIER_HA_URL", "ATELIER_HA_TOKEN", "ATELIER_HA_NOTIFY_SERVICE"];
  for (const [label, names] of [
    ["VAPID", vapid],
    ["Home Assistant", ha],
  ]) {
    const given = set(names);
    if (given.length && given.length < names.length)
      throw Error(
        `${label} notifications need all of ${names.join(", ")}; missing ${names.filter((n) => !env[n]).join(", ")}.`,
      );
  }
  if (env.ATELIER_VAPID_SUBJECT && !/^(mailto:|https:\/\/)/.test(env.ATELIER_VAPID_SUBJECT))
    throw Error("ATELIER_VAPID_SUBJECT must start with mailto: or https://.");
  if (env.ATELIER_ALARM_CHANNEL && !["ha", "push", "both"].includes(env.ATELIER_ALARM_CHANNEL))
    throw Error("ATELIER_ALARM_CHANNEL must be one of ha, push or both.");
}
export async function sendHomeAssistantAlarm(timer, config, { fetchImpl = fetch } = {}) {
  if (!config) return { accepted: false, status: "not_configured" };
  const name = config.service.split(".")[1];
  const isGerman = timer.locale !== "en";
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(`${config.url}/api/services/notify/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: isGerman ? "Mealie Atelier · Küchentimer" : "Mealie Atelier · Kitchen timer",
        message: isGerman ? `${timer.label} ist fertig!` : `${timer.label} is ready!`,
        data: { tag: `atelier-timer-${timer.id}`, importance: "high", ttl: 3600, priority: "high" },
      }),
      redirect: "manual",
      signal: controller.signal,
    });
    return { accepted: response.ok, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}
export function createDelivery({ env = process.env, fetchImpl = fetch } = {}) {
  const vapid = vapidPublicPrivate(env),
    ha = getHomeAssistantConfig(env);
  const mode = env.ATELIER_ALARM_CHANNEL || "both";
  return {
    vapid,
    ha,
    deliver: async (timer) => {
      const statuses = [],
        expiredIds = [];
      let accepted = false;
      if (mode !== "ha" && vapid) {
        const isGerman = timer.locale !== "en";
        for (const device of timer.subscriptions) {
          try {
            const reply = await sendWebPush(
              device.subscription,
              {
                type: "timer",
                id: timer.id,
                title: isGerman ? "Mealie Atelier · Küchentimer" : "Mealie Atelier · Kitchen timer",
                body: isGerman ? `${timer.label} ist fertig!` : `${timer.label} is ready!`,
                url: "/",
              },
              vapid,
              { fetchImpl },
            );
            statuses.push({ channel: "webpush", status: reply.status, accepted: reply.accepted });
            accepted ||= reply.accepted;
            if (reply.expired) expiredIds.push(device.id);
          } catch (e) {
            statuses.push({ channel: "webpush", status: "failed", accepted: false });
          }
        }
      }
      if (mode !== "push" && ha) {
        try {
          const reply = await sendHomeAssistantAlarm(timer, ha, { fetchImpl });
          statuses.push({
            channel: "homeassistant",
            status: reply.status,
            accepted: reply.accepted,
          });
          accepted ||= reply.accepted;
        } catch {
          statuses.push({ channel: "homeassistant", status: "failed", accepted: false });
        }
      }
      return {
        accepted,
        channels: statuses,
        expiredIds,
        error: accepted
          ? ""
          : statuses.length
            ? "All configured notification channels rejected the alarm"
            : "No notification channel configured",
      };
    },
  };
}
