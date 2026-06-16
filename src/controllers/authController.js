import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { validate } from '../utils/validator.js';
import { logSystemActivity } from './activityController.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Handle user signup
 */
export const signup = asyncHandler(async (req, res, next) => {
  console.log("SIGNUP FUNCTION CALLED");
  const { email, password, firstName, lastName, role } = req.body;

  validate.required(req.body, ['email', 'password']);
  validate.email(email);
  validate.string(password, 'password', 6);

  if (role) {
    validate.oneOf(role, ['Admin', 'Manager', 'Team Lead', 'Employee', 'HR'], 'role');
  }

  // Pass user metadata to signup so the handle_new_user trigger can capture it
  console.log("========== SIGNUP REQUEST ==========");
  console.log({
    email,
    firstName,
    lastName,
    role
  });

  const { data, error } = await req.db.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName || '',
        last_name: lastName || '',
        role: role || 'Employee'
      }
    }
  });

  console.log("========== SIGNUP RESPONSE ==========");
  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    console.error("========== SIGNUP ERROR ==========");
    console.error(error);
    return next(new AppError(error.message, 400));
  }

  if (!data.user) {
    console.error("SIGNUP FAILED - NO USER RETURNED");
    return next(new AppError('Signup failed. User object not generated.', 400));
  }

  console.log("========== USER CREATED ==========");
  console.log(data.user);

  // If role was explicitly specified, set it in app_metadata via admin client so it goes into JWT
  if (role && role !== 'Employee') {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.user.id,
      { app_metadata: { role } }
    );
    if (updateError) {
      console.error('Failed to update app_metadata role for new user:', updateError);
    }
  }

  await logSystemActivity(data.user.id, 'USER_SIGNUP', { email });

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully. Please verify your email if email confirmation is enabled.',
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        role: role || 'Employee'
      }
    }
  });
});

/**
 * Handle user login
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  validate.required(req.body, ['email', 'password']);
  validate.email(email);

  const { data, error } = await req.db.auth.signInWithPassword({
    email,
    password
  });

  if (error) return next(new AppError(error.message, 401));

  await logSystemActivity(data.user.id, 'USER_LOGIN', { email });

  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully.',
    data: {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role || data.user.user_metadata?.role || 'Employee'
      }
    }
  });
});

/**
 * Handle user logout
 */
export const logout = asyncHandler(async (req, res, next) => {
  const { error } = await req.db.auth.signOut();

  if (error) return next(new AppError(error.message, 400));

  if (req.user) {
    await logSystemActivity(req.user.id, 'USER_LOGOUT');
  }

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully.'
  });
});

/**
 * Request password reset email
 */
export const resetPasswordRequest = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  validate.required(req.body, ['email']);
  validate.email(email);

  const { error } = await req.db.auth.resetPasswordForEmail(email);

  if (error) return next(new AppError(error.message, 400));

  res.status(200).json({
    status: 'success',
    message: 'Password reset link sent to your email.'
  });
});

/**
 * Update password for logged-in user
 */
export const updatePassword = asyncHandler(async (req, res, next) => {
  const { password } = req.body;
  validate.required(req.body, ['password']);
  validate.string(password, 'password', 6);

  const { error } = await req.db.auth.updateUser({ password });

  if (error) return next(new AppError(error.message, 400));

  await logSystemActivity(req.user.id, 'PASSWORD_UPDATE');

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully.'
  });
});

/**
 * Get current profile details
 */
export const getProfile = asyncHandler(async (req, res, next) => {
  const { data, error } = await req.db
    .from('profiles')
    .select(`
      *,
      departments(id, name)
    `)
    .eq('id', req.user.id)
    .single();

  if (error) return next(error);

  res.status(200).json({
    status: 'success',
    data
  });
});

/**
 * Update current user profile details
 */
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { firstName, lastName } = req.body;

  const updates = {};
  if (firstName !== undefined) updates.first_name = firstName;
  if (lastName !== undefined) updates.last_name = lastName;

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid profile update parameters provided.', 400));
  }

  const { data, error } = await req.db
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'PROFILE_UPDATE', updates);

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully.',
    data
  });
});

/**
 * Get all profiles (for assignee, manager, team lead dropdowns)
 */
export const getProfiles = asyncHandler(async (req, res, next) => {
  const { data, error } = await req.db
    .from('profiles')
    .select('*')
    .order('first_name', { ascending: true });

  if (error) return next(error);

  res.status(200).json({
    status: 'success',
    data
  });
});
