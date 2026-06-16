import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("SUPABASE_URL =>", supabaseUrl);
// Auto-decode project ref from JWT if URL does not contain protocol (e.g., publishable key prefix)
if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  if (supabaseAnonKey) {
    try {
      const parts = supabaseAnonKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.ref) {
          supabaseUrl = `https://${payload.ref}.supabase.co`;
        }
      }
    } catch (e) {
      console.error('Failed to decode project ref from SUPABASE_ANON_KEY:', e);
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('WARNING: SUPABASE_URL and SUPABASE_ANON_KEY must be defined in your .env file.');
}

// Global anonymous client (uses client permissions, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin service-role client (bypasses RLS, use only in secure server actions)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey // Fallback to avoid crash on incomplete setup
);

/**
 * Returns a user-scoped Supabase client that uses the user's Auth JWT.
 * This is crucial for enforcing Row-Level Security (RLS) on database operations.
 * 
 * @param {string} authHeader - The Authorization header from the request (e.g. 'Bearer <jwt>')
 */
export const getSupabaseClient = (authHeader) => {
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;

  if (!token) {
    return supabase;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};
