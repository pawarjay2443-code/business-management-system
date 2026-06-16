import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { validate } from '../utils/validator.js';
import { logSystemActivity } from './activityController.js';

/**
 * Create a new Department
 */
export const createDepartment = asyncHandler(async (req, res, next) => {
  const { name, description, managerId } = req.body;

  validate.required(req.body, ['name']);
  validate.string(name, 'name');

  if (managerId) {
    validate.uuid(managerId, 'managerId');
  }

  const { data, error } = await req.db
    .from('departments')
    .insert({
      name,
      description,
      manager_id: managerId || null
    })
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'CREATE_DEPARTMENT', { departmentId: data.id, name });

  res.status(201).json({
    status: 'success',
    message: 'Department created successfully.',
    data
  });
});

/**
 * Get all Departments (supporting pagination and filtering)
 */
export const getDepartments = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search = '' } = req.query;

  let query = req.db
    .from('departments')
    .select(`
      *,
      manager:manager_id (id, first_name, last_name, email)
    `, { count: 'exact' });

  if (search) {
    query = query.ilike('name', `%${search}%`);
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
 * Get single Department detail by ID
 */
export const getDepartmentById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('departments')
    .select(`
      *,
      manager:manager_id (id, first_name, last_name, email),
      teams (id, name, lead_id),
      projects (id, name, status)
    `)
    .eq('id', id)
    .single();

  if (error) return next(new AppError('Department not found.', 404));

  res.status(200).json({
    status: 'success',
    data
  });
});

/**
 * Update a Department details
 */
export const updateDepartment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, managerId } = req.body;

  validate.uuid(id, 'id');

  const updates = {};
  if (name !== undefined) {
    validate.string(name, 'name');
    updates.name = name;
  }
  if (description !== undefined) {
    updates.description = description;
  }
  if (managerId !== undefined) {
    if (managerId !== null) {
      validate.uuid(managerId, 'managerId');
    }
    updates.manager_id = managerId;
  }

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid update fields specified.', 400));
  }

  const { data, error } = await req.db
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'UPDATE_DEPARTMENT', { departmentId: id, updates });

  res.status(200).json({
    status: 'success',
    message: 'Department updated successfully.',
    data
  });
});

/**
 * Delete a Department
 */
export const deleteDepartment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('departments')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);
  if (!data) return next(new AppError('Department not found or already deleted.', 404));

  await logSystemActivity(req.user.id, 'DELETE_DEPARTMENT', { departmentId: id, name: data.name });

  res.status(200).json({
    status: 'success',
    message: 'Department deleted successfully.',
    data
  });
});
