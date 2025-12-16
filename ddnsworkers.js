const CF_API = "https://api.cloudflare.com/client/v4";

const IP_PREFIXES = [
  "108.162.198",
  "162.159.44",
  "172.64.229",
  "162.159.45",
  "162.159.38",
  "162.159.39",
  "172.64.52"
];

const TARGET = 5;

function randIp(prefix) {
  return `${prefix}.${Math.floor(Math.random() * 254) + 1}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cfApi(env, method, path, data = null, retry = 0) {
  const backoff = Math.min(2 ** retry, 8) * 1000;

  try {
    const options = {
      method,
      headers: {
        "X-Auth-Email": env.CF_EMAIL,
        "X-Auth-Key": env.CF_API_KEY,
        "Content-Type": "application/json"
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const res = await fetch(`${CF_API}${path}`, options);

    if (res.status === 429 && retry < 3) {
      await sleep(backoff);
      return cfApi(env, method, path, data, retry + 1);
    }

    const json = await res.json();

    if (!json.success && retry < 3) {
      await sleep(backoff);
      return cfApi(env, method, path, data, retry + 1);
    }

    return json;
  } catch (e) {
    if (retry < 3) {
      await sleep(backoff);
      return cfApi(env, method, path, data, retry + 1);
    }
    return { success: false, error: e.message };
  }
}

async function getRecords(env) {
  const path = `/zones/${env.CF_ZONE_ID}/dns_records?type=A&name=${env.CF_RECORD_NAME}`;
  const result = await cfApi(env, "GET", path);
  return result.success ? result.result : [];
}

async function createRecord(env, ip) {
  const path = `/zones/${env.CF_ZONE_ID}/dns_records`;
  return cfApi(env, "POST", path, {
    type: "A",
    name: env.CF_RECORD_NAME,
    content: ip,
    ttl: 120
  });
}

async function updateRecord(env, id, ip) {
  const path = `/zones/${env.CF_ZONE_ID}/dns_records/${id}`;
  return cfApi(env, "PUT", path, {
    type: "A",
    name: env.CF_RECORD_NAME,
    content: ip,
    ttl: 120
  });
}

async function deleteRecord(env, id) {
  const path = `/zones/${env.CF_ZONE_ID}/dns_records/${id}`;
  return cfApi(env, "DELETE", path);
}

async function updateDns(env) {
  const allRecords = await getRecords(env);
  const tasks = [];
  const stats = { deleted: 0, updated: 0, created: 0, errors: [] };

  for (const prefix of IP_PREFIXES) {
    let related = allRecords.filter((r) => r.content.startsWith(prefix + "."));

    if (related.length > TARGET) {
      for (const r of related.slice(TARGET)) {
        tasks.push(
          deleteRecord(env, r.id)
            .then(() => stats.deleted++)
            .catch((e) => stats.errors.push(`delete: ${e.message}`))
        );
      }
      related = related.slice(0, TARGET);
    }

    for (const r of related) {
      tasks.push(
        updateRecord(env, r.id, randIp(prefix))
          .then(() => stats.updated++)
          .catch((e) => stats.errors.push(`update: ${e.message}`))
      );
    }

    const need = TARGET - related.length;
    for (let i = 0; i < need; i++) {
      tasks.push(
        createRecord(env, randIp(prefix))
          .then(() => stats.created++)
          .catch((e) => stats.errors.push(`create: ${e.message}`))
      );
    }
  }

  await Promise.all(tasks);
  return stats;
}

export default {
  async fetch(request, env) {
    if (env.ACCESS_SECRET) {
      const url = new URL(request.url);
      if (url.searchParams.get("secret") !== env.ACCESS_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    try {
      const result = await updateDns(env);
      return new Response(
        JSON.stringify({
          success: true,
          time: new Date().toISOString(),
          ...result
        }, null, 2),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: e.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(updateDns(env));
  }
};