import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { validate } from '../utils/validator.js';
import { logSystemActivity } from './activityController.js';

/**
 * Create a new Report
 */
export const createReport = asyncHandler(async (req, res, next) => {
  const { title, type, fileUrl, data } = req.body;

  validate.required(req.body, ['title', 'type']);
  validate.string(title, 'title');
  validate.oneOf(type, ['Financial', 'Performance', 'Operational', 'AI Insight'], 'type');

  const { data: report, error } = await req.db
    .from('reports')
    .insert({
      title,
      type,
      file_url: fileUrl || null,
      data: data || {},
      created_by: req.user.id
    })
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'CREATE_REPORT', { reportId: report.id, title });

  res.status(201).json({
    status: 'success',
    message: 'Report created successfully.',
    data: report
  });
});

/**
 * Get all Reports
 */
export const getReports = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, type } = req.query;

  let query = req.db
    .from('reports')
    .select(`
      *,
      creator:created_by(id, first_name, last_name, email)
    `, { count: 'exact' });

  if (type) {
    validate.oneOf(type, ['Financial', 'Performance', 'Operational', 'AI Insight'], 'type');
    query = query.eq('type', type);
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
 * Get Report by ID
 */
export const getReportById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('reports')
    .select(`
      *,
      creator:created_by(id, first_name, last_name, email)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return next(new AppError('Report not found or access denied.', 404));

  res.status(200).json({
    status: 'success',
    data
  });
});

/**
 * Update Report
 */
export const updateReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, type, fileUrl, data } = req.body;

  validate.uuid(id, 'id');

  const updates = {};
  if (title !== undefined) {
    validate.string(title, 'title');
    updates.title = title;
  }
  if (type !== undefined) {
    validate.oneOf(type, ['Financial', 'Performance', 'Operational', 'AI Insight'], 'type');
    updates.type = type;
  }
  if (fileUrl !== undefined) updates.file_url = fileUrl;
  if (data !== undefined) updates.data = data;

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid update fields specified.', 400));
  }

  const { data: updatedReport, error } = await req.db
    .from('reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);

  await logSystemActivity(req.user.id, 'UPDATE_REPORT', { reportId: id, updates });

  res.status(200).json({
    status: 'success',
    message: 'Report updated successfully.',
    data: updatedReport
  });
});

/**
 * Delete Report
 */
export const deleteReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  validate.uuid(id, 'id');

  const { data, error } = await req.db
    .from('reports')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) return next(error);
  if (!data) return next(new AppError('Report not found or already deleted.', 404));

  await logSystemActivity(req.user.id, 'DELETE_REPORT', { reportId: id, title: data.title });

  res.status(200).json({
    status: 'success',
    message: 'Report deleted successfully.',
    data
  });
});

/**
 * Export Report data as CSV or JSON format
 */
export const exportReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { format = 'json' } = req.query;

  validate.uuid(id, 'id');
  validate.oneOf(format, ['json', 'csv'], 'format');

  const { data: report, error } = await req.db
    .from('reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !report) return next(new AppError('Report not found or access denied.', 404));

  await logSystemActivity(req.user.id, 'EXPORT_REPORT', { reportId: id, format });

  const reportData = report.data;

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=report_${id}.json`);
    return res.status(200).send(JSON.stringify(reportData, null, 2));
  }

  if (format === 'csv') {
    // Generate simple CSV from json object/arrays
    let csvContent = '';
    
    if (Array.isArray(reportData)) {
      if (reportData.length > 0) {
        const headers = Object.keys(reportData[0]);
        csvContent += headers.join(',') + '\n';
        
        reportData.forEach(row => {
          const values = headers.map(header => {
            const val = row[header];
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
          });
          csvContent += values.join(',') + '\n';
        });
      }
    } else if (typeof reportData === 'object' && reportData !== null) {
      csvContent += 'Key,Value\n';
      Object.keys(reportData).forEach(key => {
        const val = reportData[key];
        const valStr = typeof val === 'object' ? JSON.stringify(val) : val;
        csvContent += `"${key}","${String(valStr).replace(/"/g, '""')}"\n`;
      });
    } else {
      csvContent += 'Value\n';
      csvContent += `"${String(reportData).replace(/"/g, '""')}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report_${id}.csv`);
    return res.status(200).send(csvContent);
  }
});
