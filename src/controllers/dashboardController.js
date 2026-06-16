import { asyncHandler } from '../utils/errorHandler.js';

/**
 * Get aggregated Dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  // Execute requests in parallel for optimized dashboard performance
  const [
    projectsRes,
    tasksRes,
    recentActivitiesRes,
    recentInsightsRes,
    performanceRes
  ] = await Promise.all([
    // 1. Projects Breakdown
    req.db.from('projects').select('id, status'),

    // 2. Tasks Breakdown
    req.db.from('tasks').select('id, status, priority, assignee_id'),

    // 3. Recent Activities (limit 5)
    req.db
      .from('activity_logs')
      .select('*, profiles:user_id(first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .limit(5),

    // 4. AI Recommendations / Insights (limit 5)
    req.db
      .from('ai_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),

    // 5. Performance Ratings
    req.db
      .from('performance_metrics')
      .select('user_id, score, profiles:user_id(first_name, last_name, email)')
  ]);

  if (projectsRes.error) return next(projectsRes.error);
  if (tasksRes.error) return next(tasksRes.error);
  if (recentActivitiesRes.error) return next(recentActivitiesRes.error);
  if (recentInsightsRes.error) return next(recentInsightsRes.error);
  if (performanceRes.error) return next(performanceRes.error);

  const projects = projectsRes.data || [];
  const tasks = tasksRes.data || [];
  const activities = recentActivitiesRes.data || [];
  const insights = recentInsightsRes.data || [];
  const performance = performanceRes.data || [];

  // Project calculations
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;

  // Task calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const pendingTasks = totalTasks - completedTasks;

  // Employee productivity calculations (grouped from evaluations)
  const employeeProductivityMap = {};
  performance.forEach(metric => {
    const userId = metric.user_id;
    if (!employeeProductivityMap[userId]) {
      employeeProductivityMap[userId] = {
        name: metric.profiles
          ? `${metric.profiles.first_name} ${metric.profiles.last_name}`.trim()
          : 'Unknown User',
        totalScore: 0,
        count: 0
      };
    }
    employeeProductivityMap[userId].totalScore += Number(metric.score);
    employeeProductivityMap[userId].count += 1;
  });

  const employeeProductivity = Object.keys(employeeProductivityMap).map(userId => {
    const item = employeeProductivityMap[userId];
    return {
      userId,
      employeeName: item.name,
      averageScore: Number((item.totalScore / item.count).toFixed(2))
    };
  }).sort((a, b) => b.averageScore - a.averageScore); // Highest rated first

  // Team productivity indicator (aggregated by completed tasks percentage per assignee)
  const taskProductivityMap = {};
  tasks.forEach(t => {
    if (!t.assignee_id) return;
    if (!taskProductivityMap[t.assignee_id]) {
      taskProductivityMap[t.assignee_id] = { total: 0, completed: 0 };
    }
    taskProductivityMap[t.assignee_id].total += 1;
    if (t.status === 'Done') {
      taskProductivityMap[t.assignee_id].completed += 1;
    }
  });

  const teamProductivity = Object.keys(taskProductivityMap).map(assigneeId => {
    const item = taskProductivityMap[assigneeId];
    const completedRatio = item.total > 0 ? (item.completed / item.total) : 0;
    return {
      userId: assigneeId,
      completionRate: Number((completedRatio * 100).toFixed(1)),
      totalTasks: item.total,
      completedTasks: item.completed
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalProjects,
        activeProjects,
        completedTasks,
        pendingTasks,
        taskCompletionRate: totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0
      },
      teamProductivity,
      employeeProductivity,
      recentActivities: activities,
      aiRecommendations: insights
    }
  });
});
