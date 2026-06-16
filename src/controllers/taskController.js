import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { validate } from '../utils/validator.js';
import { logSystemActivity } from './activityController.js';

/**
 * Create a new Task
 */
export const createTask = asyncHandler(async (req, res, next) => {
  const { title, description, projectId, assigneeId, priority, dueDate } = req.body;

  validate.required(req.body, ['title', 'projectId']);
  validate.string(title, 'title');
  validate.uuid(projectId, 'projectId');

  if (assigneeId) validate.uuid(assigneeId, 'assigneeId');
  if (priority) {
    validate.oneOf(priority, ['Low', 'Medium', 'High', 'Urgent'], 'priority');
  }

  const { data, error } = await req.db
    .from('tasks')
    .insert({
      title,
      description: description || null,
      project_id: projectId,
      assignee_id: assigneeId || null,
      reporter_id: req.user.id,
      status: 'Todo',
      priority: priority || 'Medium',
      due_date: dueDate || null
    })
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'CREATE_TASK', { taskId: data.id, title });

  res.status(201).json({
    status: 'success',
    message: 'Task created successfully.',
    data
  });
});

/**
 * Get all Tasks (with filters, sorting, search, pagination)
 */
export const getTasks = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    projectId,
    assigneeId,
    status,
    priority,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search = ''
  } = req.query;

  let query = req.db
    .from('tasks')
    .select(`
      *,
      projects(id, name),
      assignee:assignee_id(id, first_name, last_name, email),
      reporter:reporter_id(id, first_name, last_name, email)
    `, { count: 'exact' });

  if (projectId) {
    validate.uuid(projectId, 'projectId');
    query = query.eq('project_id', projectId);
  }
  if (assigneeId) {
    validate.uuid(assigneeId, 'assigneeId');
    query = query.eq('assignee_id', assigneeId);
  }
  if (status) {
    validate.oneOf(status, ['Todo', 'In Progress', 'In Review', 'Done'], 'status');
    query = query.eq('status', status);
  }
  if (priority) {
    validate.oneOf(priority, ['Low', 'Medium', 'High', 'Urgent'], 'priority');
    query = query.eq('priority', priority);
  }
  if (search) {
    query = query.ilike('title', `%${search}%`);
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
 * Get single Task
 */
export const getTaskById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('tasks')
    .select(`
      *,
      projects(id, name),
      assignee:assignee_id(id, first_name, last_name, email),
      reporter:reporter_id(id, first_name, last_name, email)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return next(new AppError('Task not found.', 404));

  res.status(200).json({
    status: 'success',
    data
  });
});

/**
 * Update Task
 */
export const updateTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, assigneeId, status, priority, dueDate } = req.body;

  validate.uuid(id, 'id');

  // Load existing task to check permissions
  const { data: existingTask, error: loadError } = await req.db
    .from('tasks')
    .select('assignee_id, status')
    .eq('id', id)
    .single();

  if (loadError || !existingTask) {
    return next(new AppError('Task not found.', 404));
  }

  const userRole = req.user.role;
  const isAssignee = existingTask.assignee_id === req.user.id;
  const isManagerOrLead = ['Admin', 'Manager', 'Team Lead'].includes(userRole);

  if (!isManagerOrLead && !isAssignee) {
    return next(new AppError('You do not have permission to update this task.', 403));
  }

  const updates = {};
  
  if (isManagerOrLead) {
    // Managers/leads can modify any fields
    if (title !== undefined) {
      validate.string(title, 'title');
      updates.title = title;
    }
    if (description !== undefined) updates.description = description;
    if (assigneeId !== undefined) {
      if (assigneeId !== null) validate.uuid(assigneeId, 'assigneeId');
      updates.assignee_id = assigneeId;
    }
    if (priority !== undefined) {
      validate.oneOf(priority, ['Low', 'Medium', 'High', 'Urgent'], 'priority');
      updates.priority = priority;
    }
    if (dueDate !== undefined) updates.due_date = dueDate;
  }

  // Both assignees and managers can update status
  if (status !== undefined) {
    validate.oneOf(status, ['Todo', 'In Progress', 'In Review', 'Done'], 'status');
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid update parameters specified or unauthorized updates.', 400));
  }

  const { data, error } = await req.db
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'UPDATE_TASK', { taskId: id, updates });

  res.status(200).json({
    status: 'success',
    message: 'Task updated successfully.',
    data
  });
});

/**
 * Assign a Task to a User
 */
export const assignTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { assigneeId } = req.body;

  validate.uuid(id, 'id');
  validate.required(req.body, ['assigneeId']);
  validate.uuid(assigneeId, 'assigneeId');

  const { data, error } = await req.db
    .from('tasks')
    .update({ assignee_id: assigneeId })
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'ASSIGN_TASK', { taskId: id, assigneeId });

  res.status(200).json({
    status: 'success',
    message: 'Task assigned successfully.',
    data
  });
});

/**
 * Update status of a Task
 */
export const updateTaskStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  validate.uuid(id, 'id');
  validate.required(req.body, ['status']);
  validate.oneOf(status, ['Todo', 'In Progress', 'In Review', 'Done'], 'status');

  // Load existing task
  const { data: existingTask, error: loadError } = await req.db
    .from('tasks')
    .select('assignee_id')
    .eq('id', id)
    .single();

  if (loadError || !existingTask) {
    return next(new AppError('Task not found.', 404));
  }

  const isAssignee = existingTask.assignee_id === req.user.id;
  const isManagerOrLead = ['Admin', 'Manager', 'Team Lead'].includes(req.user.role);

  if (!isManagerOrLead && !isAssignee) {
    return next(new AppError('You can only update the status of tasks assigned to you.', 403));
  }

  const { data, error } = await req.db
    .from('tasks')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'UPDATE_TASK_STATUS', { taskId: id, status });

  res.status(200).json({
    status: 'success',
    message: `Task status updated to '${status}'.`,
    data
  });
});

/**
 * Delete a Task
 */
export const deleteTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('tasks')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);
  if (!data) return next(new AppError('Task not found or already deleted.', 404));

  await logSystemActivity(req.user.id, 'DELETE_TASK', { taskId: id, title: data.title });

  res.status(200).json({
    status: 'success',
    message: 'Task deleted successfully.',
    data
  });
});
