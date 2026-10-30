// Admin-only user management for Super Outlet Inventory.
// Auth is checked in code: the caller's access token must belong to a profile with role = 'admin'.
// Deployed to Supabase as the `admin-users` Edge Function (verify_jwt = false).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const EMAIL_DOMAIN = "superoutlet.local";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } = { user: null } } = await admin.auth.getUser(token);
  if (!user) return json({ error: "Please sign in again." }, 401);

  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return json({ error: "Only admins can manage users." }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

  const action = body.action;

  if (action === "list") {
    const { data, error } = await admin.from("profiles").select("id, username, role, created_at").order("username");
    if (error) return json({ error: error.message }, 500);
    return json({ users: data });
  }

  if (action === "create") {
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const role = body.role === "admin" ? "admin" : "staff";
    if (!/^[A-Za-z0-9._-]{2,30}$/.test(username)) {
      return json({ error: "Username must be 2-30 letters, numbers, dots, dashes or underscores." }, 400);
    }
    if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);

    const { data: taken } = await admin.from("profiles").select("id").ilike("username", username).maybeSingle();
    if (taken) return json({ error: `Username "${username}" is already taken.` }, 409);

    const { data, error } = await admin.auth.admin.createUser({
      email: `${username.toLowerCase()}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
      user_metadata: { username },
      app_metadata: { provisioned: true, role },
    });
    if (error) return json({ error: error.message }, 400);

    // Auth writes app_metadata after the insert trigger runs, so create the profile here.
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, username, role });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: profileError.message }, 500);
    }
    return json({ user: { id: data.user.id, username, role } });
  }

  if (action === "reset_password") {
    const userId = String(body.user_id ?? "");
    const password = String(body.password ?? "");
    if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);
    const { data: target } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!target) return json({ error: "User not found." }, 404);
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
});
