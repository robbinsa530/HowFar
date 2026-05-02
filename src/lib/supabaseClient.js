import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
// Prefer publishable key (sb_publishable_...) from Dashboard → API; legacy anon JWT still works.
const publicKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client (publishable or legacy anon key). Only created when Vite env vars are set.
 * Configure redirect URLs in Supabase Dashboard → Authentication → URL Configuration.
 */
export const supabase =
  typeof url === 'string' &&
  url.length > 0 &&
  typeof publicKey === 'string' &&
  publicKey.length > 0
    ? createClient(url, publicKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
