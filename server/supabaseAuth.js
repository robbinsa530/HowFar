import { createClient } from '@supabase/supabase-js';

let supabaseAdmin = null;

/**
 * Elevated Supabase client for verifying user JWTs (e.g. auth.getUser(accessToken)).
 * Set SUPABASE_SECRET_KEY (sb_secret_..., Dashboard → API Keys → Secret). Never expose to the browser.
 */
export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseAdmin;
}

/**
 * @param {import('express').Request} req
 * @returns {Promise<string | null>} Supabase auth user id or null
 */
export async function getUserIdFromBearer(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const jwt = auth.slice(7).trim(); // Trim "Bearer " prefix
  if (!jwt) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);
  if (error || !user?.id) return null;
  return user.id;
}
