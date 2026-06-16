import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { validate } from '../utils/validator.js';
import { logSystemActivity } from './activityController.js';

/**
 * Store a new AI-generated Insight
 */
export const storeAIInsight = asyncHandler(async (req, res, next) => {
  const { title, insightType, content, data, projectId, teamId, departmentId } = req.body;

  validate.required(req.body, ['title', 'insightType', 'content']);
  validate.string(title, 'title');
  validate.oneOf(insightType, ['Task Bottleneck', 'Team Performance', 'Financial Forecast', 'General'], 'insightType');
  validate.string(content, 'content');

  if (projectId) validate.uuid(projectId, 'projectId');
  if (teamId) validate.uuid(teamId, 'teamId');
  if (departmentId) validate.uuid(departmentId, 'departmentId');

  const { data: insight, error } = await req.db
    .from('ai_insights')
    .insert({
      title,
      insight_type: insightType,
      content,
      data: data || {},
      project_id: projectId || null,
      team_id: teamId || null,
      department_id: departmentId || null
    })
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'STORE_AI_INSIGHT', { insightId: insight.id, title });

  res.status(201).json({
    status: 'success',
    message: 'AI Insight stored successfully.',
    data: insight
  });
});

/**
 * Get AI Insights (with paging and scoping parameters)
 */
export const getAIInsights = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, insightType, projectId, teamId, departmentId } = req.query;

  let query = req.db
    .from('ai_insights')
    .select('*', { count: 'exact' });

  if (insightType) {
    validate.oneOf(insightType, ['Task Bottleneck', 'Team Performance', 'Financial Forecast', 'General'], 'insightType');
    query = query.eq('insight_type', insightType);
  }
  if (projectId) {
    validate.uuid(projectId, 'projectId');
    query = query.eq('project_id', projectId);
  }
  if (teamId) {
    validate.uuid(teamId, 'teamId');
    query = query.eq('team_id', teamId);
  }
  if (departmentId) {
    validate.uuid(departmentId, 'departmentId');
    query = query.eq('department_id', departmentId);
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
 * Delete AI Insight
 */
export const deleteAIInsight = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('ai_insights')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);
  if (!data) return next(new AppError('Insight not found or already deleted.', 404));

  await logSystemActivity(req.user.id, 'DELETE_AI_INSIGHT', { insightId: id });

  res.status(200).json({
    status: 'success',
    message: 'AI Insight deleted successfully.',
    data
  });
});
