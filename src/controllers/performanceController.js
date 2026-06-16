import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { validate } from '../utils/validator.js';
import { logSystemActivity } from './activityController.js';

/**
 * Log performance metrics entry
 */
export const createPerformanceMetric = asyncHandler(async (req, res, next) => {
  const { userId, periodStart, periodEnd, score, comments, metrics } = req.body;

  validate.required(req.body, ['userId', 'periodStart', 'periodEnd', 'score']);
  validate.uuid(userId, 'userId');
  validate.numberRange(score, 'score', 0.00, 5.00);

  const { data, error } = await req.db
    .from('performance_metrics')
    .insert({
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      score: Number(score),
      comments: comments || null,
      metrics: metrics || {},
      evaluator_id: req.user.id
    })
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'CREATE_PERFORMANCE_METRIC', { metricId: data.id, userId });

  res.status(201).json({
    status: 'success',
    message: 'Performance metric recorded successfully.',
    data
  });
});

/**
 * Get all performance metrics
 */
export const getPerformanceMetrics = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, userId } = req.query;

  let query = req.db
    .from('performance_metrics')
    .select(`
      *,
      user:user_id(id, first_name, last_name, email),
      evaluator:evaluator_id(id, first_name, last_name, email)
    `, { count: 'exact' });

  if (userId) {
    validate.uuid(userId, 'userId');
    query = query.eq('user_id', userId);
  }

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

/**
 * Calculate KPI Scores dynamically based on task weights and completion
 */
export const calculateKPIScores = asyncHandler(async (req, res, next) => {
  const { userId } = req.query;
  validate.required(req.query, ['userId']);
  validate.uuid(userId, 'userId');

  // Fetch tasks assigned to user
  const { data: tasks, error: tasksError } = await req.db
    .from('tasks')
    .select('id, status, priority')
    .eq('assignee_id', userId);

  if (tasksError) return next(tasksError);

  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return res.status(200).json({
      status: 'success',
      data: {
        userId,
        kpiScore: 0.00,
        completedTasks: 0,
        totalTasks: 0,
        message: 'No tasks assigned to evaluate KPI.'
      }
    });
  }

  // Weight map based on task priority
  const priorityWeights = {
    'Low': 0.8,
    'Medium': 1.0,
    'High': 1.2,
    'Urgent': 1.5
  };

  let totalWeight = 0;
  let earnedWeight = 0;

  tasks.forEach(task => {
    const weight = priorityWeights[task.priority] || 1.0;
    totalWeight += weight;
    if (task.status === 'Done') {
      earnedWeight += weight;
    }
  });

  // KPI Score scaled from 0 to 5.0
  const ratio = totalWeight > 0 ? (earnedWeight / totalWeight) : 0;
  const kpiScore = Number((ratio * 5.0).toFixed(2));

  res.status(200).json({
    status: 'success',
    data: {
      userId,
      kpiScore,
      completedTasks: tasks.filter(t => t.status === 'Done').length,
      totalTasks,
      ratio: Number(ratio.toFixed(2)),
      breakdown: {
        totalWeight,
        earnedWeight
      }
    }
  });
});

/**
 * Aggregate employee productivity score indexes
 */
export const getProductivityAnalytics = asyncHandler(async (req, res, next) => {
  // Pull scores list
  const { data: metrics, error } = await req.db
    .from('performance_metrics')
    .select('id, score, user_id, departments:profiles(department_id)');

  if (error) return next(error);

  const totalEvaluations = metrics.length;
  if (totalEvaluations === 0) {
    return res.status(200).json({
      status: 'success',
      data: {
        overallAverageProductivity: 0.0,
        totalEvaluations: 0,
        byUser: []
      }
    });
  }

  const overallAvg = metrics.reduce((sum, m) => sum + Number(m.score), 0) / totalEvaluations;

  // Group by user
  const userGroups = {};
  metrics.forEach(m => {
    if (!userGroups[m.user_id]) userGroups[m.user_id] = [];
    userGroups[m.user_id].push(Number(m.score));
  });

  const byUser = Object.keys(userGroups).map(uid => {
    const scores = userGroups[uid];
    const avg = scores.reduce((s, val) => s + val, 0) / scores.length;
    return {
      userId: uid,
      averageScore: Number(avg.toFixed(2)),
      reviewsCount: scores.length
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      overallAverageProductivity: Number(overallAvg.toFixed(2)),
      totalEvaluations,
      byUser
    }
  });
});

/**
 * Get performance metric details by ID
 */
export const getPerformanceMetricById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('performance_metrics')
    .select(`
      *,
      user:user_id(id, first_name, last_name, email),
      evaluator:evaluator_id(id, first_name, last_name, email)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return next(new AppError('Metric record not found or access denied.', 404));

  res.status(200).json({
    status: 'success',
    data
  });
});

/**
 * Update performance metrics detail
 */
export const updatePerformanceMetric = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { score, comments, metrics } = req.body;

  validate.uuid(id, 'id');

  const updates = {};
  if (score !== undefined) {
    validate.numberRange(score, 'score', 0.00, 5.00);
    updates.score = Number(score);
  }
  if (comments !== undefined) updates.comments = comments;
  if (metrics !== undefined) updates.metrics = metrics;

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid update fields specified.', 400));
  }

  const { data, error } = await req.db
    .from('performance_metrics')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'UPDATE_PERFORMANCE_METRIC', { metricId: id, updates });

  res.status(200).json({
    status: 'success',
    message: 'Performance metric updated successfully.',
    data
  });
});

/**
 * Delete performance metrics detail
 */
export const deletePerformanceMetric = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('performance_metrics')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);
  if (!data) return next(new AppError('Metric not found or already deleted.', 404));

  await logSystemActivity(req.user.id, 'DELETE_PERFORMANCE_METRIC', { metricId: id, userId: data.user_id });

  res.status(200).json({
    status: 'success',
    message: 'Performance metric deleted successfully.',
    data
  });
});
