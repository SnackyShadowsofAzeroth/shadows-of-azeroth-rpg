import * as story from "./functions/api/story.js";
import * as campaign from "./functions/api/campaign.js";

const json = (body, status = 405) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "allow": "GET, POST",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  },
});

async function routeApi(path, request, env, ctx) {
  const route = path.replace(/\/$/, "");
  const handlers = route === "/api/story" ? story : route === "/api/campaign" ? campaign : null;
  if (!handlers) return json({ error: "Not found" }, 404);

  const handler = request.method === "GET" ? handlers.onRequestGet
    : request.method === "POST" ? handlers.onRequestPost
      : null;
  if (!handler) return json({ error: "Method not allowed" });
  return handler({ request, env, ctx, params: {}, data: {} });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return routeApi(pathname, request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
