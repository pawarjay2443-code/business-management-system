import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { validate } from '../utils/validator.js';

/**
 * Utility helper to automatically create an activity log entry.
 * Uses supabaseAdmin to ensure system audit records are captured safely.
 * 
 * @param {string} userId - UUID of the user performing the action
 * @param {string} action - Description of the action (e.g. 'CREATE_DEPARTMENT')
 * @param {object} details - JSON metadata about the changes
 */
export const logSystemActivity = async (userId, action, details = {}) => {
  try {
    const { error } = await supabaseAdmin
      .from('activity_logs')
      .insert({
        user_id: userId,
        action,
        details
      });
    if (error) {
      console.error('Failed to write activity log:', error);
    }
  } catch (err) {
    console.error('Activity logger error:', err);
  }
};

/**
 * Get activity logs with filters, sorting, and pagination
 */
export const getActivityLogs = asyncHandler(async (req, res, next) => {
  const { userId, action, page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

  let query = req.db
    .from('activity_logs')
    .select(`
      *,
      profiles:user_id (first_name, last_name, email, role)
    `, { count: 'exact' });

  // Apply filters
  if (userId) {
    validate.uuid(userId, 'userId');
    query = query.eq('user_id', userId);
  }
  if (action) {
    query = query.ilike('action', `%${action}%`);
  }

  // Sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) return next(error);

  res.status(200).json({
    status: 'success',
    results: data.length,
    total: count,
    page: Number(page),
    totalPages: Math.ceil(count / limit),
    data
  });
});
