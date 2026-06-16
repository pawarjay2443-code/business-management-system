import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { validate } from '../utils/validator.js';
import { logSystemActivity } from './activityController.js';

/**
 * Create a new Team
 */
export const createTeam = asyncHandler(async (req, res, next) => {
  const { name, departmentId, leadId } = req.body;

  validate.required(req.body, ['name', 'departmentId']);
  validate.string(name, 'name');
  validate.uuid(departmentId, 'departmentId');

  if (leadId) {
    validate.uuid(leadId, 'leadId');
  }

  const { data, error } = await req.db
    .from('teams')
    .insert({
      name,
      department_id: departmentId,
      lead_id: leadId || null
    })
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'CREATE_TEAM', { teamId: data.id, name });

  res.status(201).json({
    status: 'success',
    message: 'Team created successfully.',
    data
  });
});

/**
 * Get all Teams
 */
export const getTeams = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, departmentId } = req.query;

  let query = req.db
    .from('teams')
    .select(`
      *,
      departments(id, name),
      lead:lead_id(id, first_name, last_name, email)
    `, { count: 'exact' });

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
 * Get single Team detail with members
 */
export const getTeamById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data: team, error: teamError } = await req.db
    .from('teams')
    .select(`
      *,
      departments(id, name),
      lead:lead_id(id, first_name, last_name, email)
    `)
    .eq('id', id)
    .single();

  if (teamError || !team) return next(new AppError('Team not found.', 404));

  // Get members
  const { data: members, error: membersError } = await req.db
    .from('team_members')
    .select(`
      joined_at,
      profile:user_id(id, first_name, last_name, email, role)
    `)
    .eq('team_id', id);

  if (membersError) return next(membersError);

  res.status(200).json({
    status: 'success',
    data: {
      ...team,
      members: members.map(m => ({
        joinedAt: m.joined_at,
        ...m.profile
      }))
    }
  });
});

/**
 * Update Team details
 */
export const updateTeam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, departmentId, leadId } = req.body;

  validate.uuid(id, 'id');

  const updates = {};
  if (name !== undefined) {
    validate.string(name, 'name');
    updates.name = name;
  }
  if (departmentId !== undefined) {
    validate.uuid(departmentId, 'departmentId');
    updates.department_id = departmentId;
  }
  if (leadId !== undefined) {
    if (leadId !== null) {
      validate.uuid(leadId, 'leadId');
    }
    updates.lead_id = leadId;
  }

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid update fields specified.', 400));
  }

  const { data, error } = await req.db
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'UPDATE_TEAM', { teamId: id, updates });

  res.status(200).json({
    status: 'success',
    message: 'Team updated successfully.',
    data
  });
});

/**
 * Delete Team
 */
export const deleteTeam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('teams')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);
  if (!data) return next(new AppError('Team not found or already deleted.', 404));

  await logSystemActivity(req.user.id, 'DELETE_TEAM', { teamId: id, name: data.name });

  res.status(200).json({
    status: 'success',
    message: 'Team deleted successfully.',
    data
  });
});

/**
 * Add a member to a Team
 */
export const addTeamMember = asyncHandler(async (req, res, next) => {
  const { id } = req.params; // team_id
  const { userId } = req.body;

  validate.uuid(id, 'team_id');
  validate.required(req.body, ['userId']);
  validate.uuid(userId, 'userId');

  const { data, error } = await req.db
    .from('team_members')
    .insert({
      team_id: id,
      user_id: userId
    })
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'ADD_TEAM_MEMBER', { teamId: id, userId });

  res.status(201).json({
    status: 'success',
    message: 'Member added to team successfully.',
    data
  });
});

/**
 * Remove a member from a Team
 */
export const removeTeamMember = asyncHandler(async (req, res, next) => {
  const { id, userId } = req.params;

  validate.uuid(id, 'team_id');
  validate.uuid(userId, 'userId');

  const { data, error } = await req.db
    .from('team_members')
    .delete()
    .match({
      team_id: id,
      user_id: userId
    })
    .select()
    .single();

  if (error) return next(error);
  if (!data) return next(new AppError('Relationship not found or already deleted.', 404));

  await logSystemActivity(req.user.id, 'REMOVE_TEAM_MEMBER', { teamId: id, userId });

  res.status(200).json({
    status: 'success',
    message: 'Member removed from team successfully.',
    data
  });
});
