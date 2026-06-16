import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { validate } from '../utils/validator.js';
import { logSystemActivity } from './activityController.js';

/**
 * Create a new Project
 */
export const createProject = asyncHandler(async (req, res, next) => {
  const { name, description, departmentId, status, startDate, endDate, milestones } = req.body;

  validate.required(req.body, ['name', 'departmentId']);
  validate.string(name, 'name');
  validate.uuid(departmentId, 'departmentId');

  if (status) {
    validate.oneOf(status, ['Planned', 'In Progress', 'Completed', 'On Hold'], 'status');
  }

  const { data, error } = await req.db
    .from('projects')
    .insert({
      name,
      description,
      department_id: departmentId,
      status: status || 'Planned',
      start_date: startDate || null,
      end_date: endDate || null,
      milestones: milestones || []
    })
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'CREATE_PROJECT', { projectId: data.id, name });

  res.status(201).json({
    status: 'success',
    message: 'Project created successfully.',
    data
  });
});

/**
 * Get all Projects
 */
export const getProjects = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, departmentId, status, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

  let query = req.db
    .from('projects')
    .select(`
      *,
      departments(id, name)
    `, { count: 'exact' });

  if (departmentId) {
    validate.uuid(departmentId, 'departmentId');
    query = query.eq('department_id', departmentId);
  }

  if (status) {
    validate.oneOf(status, ['Planned', 'In Progress', 'Completed', 'On Hold'], 'status');
    query = query.eq('status', status);
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

/**
 * Get single Project with tasks
 */
export const getProjectById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data: project, error: projectError } = await req.db
    .from('projects')
    .select(`
      *,
      departments(id, name)
    `)
    .eq('id', id)
    .single();

  if (projectError || !project) return next(new AppError('Project not found.', 404));

  // Fetch related tasks
  const { data: tasks, error: tasksError } = await req.db
    .from('tasks')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      assignee:assignee_id(id, first_name, last_name, email)
    `)
    .eq('project_id', id);

  if (tasksError) return next(tasksError);

  res.status(200).json({
    status: 'success',
    data: {
      ...project,
      tasks
    }
  });
});

/**
 * Update Project
 */
export const updateProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, departmentId, status, startDate, endDate, milestones } = req.body;

  validate.uuid(id, 'id');

  const updates = {};
  if (name !== undefined) {
    validate.string(name, 'name');
    updates.name = name;
  }
  if (description !== undefined) {
    updates.description = description;
  }
  if (departmentId !== undefined) {
    validate.uuid(departmentId, 'departmentId');
    updates.department_id = departmentId;
  }
  if (status !== undefined) {
    validate.oneOf(status, ['Planned', 'In Progress', 'Completed', 'On Hold'], 'status');
    updates.status = status;
  }
  if (startDate !== undefined) updates.start_date = startDate;
  if (endDate !== undefined) updates.end_date = endDate;
  if (milestones !== undefined) {
    if (!Array.isArray(milestones)) {
      return next(new AppError('Milestones must be an array.', 400));
    }
    updates.milestones = milestones;
  }

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid update parameters provided.', 400));
  }

  const { data, error } = await req.db
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'UPDATE_PROJECT', { projectId: id, updates });

  res.status(200).json({
    status: 'success',
    message: 'Project updated successfully.',
    data
  });
});

/**
 * Delete Project
 */
export const deleteProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('projects')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);
  if (!data) return next(new AppError('Project not found or already deleted.', 404));

  await logSystemActivity(req.user.id, 'DELETE_PROJECT', { projectId: id, name: data.name });

  res.status(200).json({
    status: 'success',
    message: 'Project deleted successfully.',
    data
  });
});

/**
 * Manage Project Milestones (Add / Update / Delete in bulk or array updates)
 */
export const manageMilestones = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { milestones } = req.body;

  validate.uuid(id, 'id');
  validate.required(req.body, ['milestones']);
  if (!Array.isArray(milestones)) {
    return next(new AppError('Milestones must be an array of milestone objects.', 400));
  }

  // Sample milestone validation: { title: string, completed: boolean, dueDate: date }
  milestones.forEach((m, i) => {
    if (!m.title || typeof m.title !== 'string') {
      throw new AppError(`Milestone at index ${i} is missing a valid 'title'.`, 400);
    }
  });

  const { data, error } = await req.db
    .from('projects')
    .update({ milestones })
    .eq('id', id)
    .select('id', 'name', 'milestones')
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'MANAGE_MILESTONES', { projectId: id, milestones });

  res.status(200).json({
    status: 'success',
    message: 'Project milestones updated successfully.',
    data
  });
});
