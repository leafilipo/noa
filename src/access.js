// Login: Cloudflare Access in front of /studio and /api; the worker verifies the token itself too.
import { list } from "./lib.js";
let certs = {}, certsAt = 0;
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), c => c.charCodeAt(0));
async function verifyAccess(token, env) {
  const [h, p, sig] = token.split("."); if (!sig) return null;
  const head = JSON.parse(new TextDecoder().decode(b64u(h))), body = JSON.parse(new TextDecoder().decode(b64u(p)));
  const team = String(body.iss || "").replace(/^https:\/\//, "").replace(/\/$/, "");
  if (!list(env.ACCESS_TEAM_DOMAIN).includes(team)) return null;
  if (!certs[team] || Date.now() - certsAt > 3600e3) { certs[team] = (await (await fetch(`https://${team}/cdn-cgi/access/certs`)).json()).keys; certsAt = Date.now(); }
  const jwk = certs[team].find(k => k.kid === head.kid); if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(sig), new TextEncoder().encode(h + "." + p));
  const auds = list(env.ACCESS_AUD), aud = [].concat(body.aud || []);
  if (!ok || (auds.length && !aud.some(a => auds.includes(a))) || body.exp * 1000 < Date.now()) return null;
  return String(body.email || "").toLowerCase();
}
async function viewer(req, env) {
  let email = null;
  if (env.ACCESS_TEAM_DOMAIN) {
    const ck = (req.headers.get("cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    const t = req.headers.get("cf-access-jwt-assertion") || (ck && ck[1]);
    email = t ? await verifyAccess(t, env).catch(() => null) : null;
  } else email = (req.headers.get("cf-access-authenticated-user-email") || "").toLowerCase() || null; // local dev only
  let users = {}; try { users = JSON.parse(env.USERS || "{}"); } catch (e) {}
  return email ? { email, name: users[email] || null } : null;
}


export { verifyAccess, viewer };
