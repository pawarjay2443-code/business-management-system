import { getSupabaseClient, supabaseAdmin } from '../config/supabase.js';
import { AppError, asyncHandler } from '../utils/errorHandler.js';

/**
 * Authentication middleware that verifies the user session via Supabase JWT
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Please log in.', 401));
  }

  const token = authHeader.split(' ')[1];
  const userClient = getSupabaseClient(authHeader);

  // Authenticate user with Supabase
  const { data: { user }, error } = await userClient.auth.getUser(token);

  if (error || !user) {
    return next(new AppError('Invalid or expired authentication token.', 401));
  }

  // Attach user identity to request
  req.user = {
    id: user.id,
    email: user.email,
    appMetadata: user.app_metadata || {},
    userMetadata: user.user_metadata || {},
    role: user.app_metadata?.role || user.user_metadata?.role || 'Employee' // Fallback role
  };

  // If role isn't explicitly found in token metadata, fetch from public.profiles
  if (!user.app_metadata?.role && !user.user_metadata?.role) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      req.user.role = profile.role;
    }
  }

  // Save the token on the request for dynamic client generation down the stream
  req.token = token;
  req.db = userClient; // Request-scoped Supabase client with user context (respects RLS)

  next();
});
