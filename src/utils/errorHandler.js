/**
 * Custom application-level error class
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Express async handler wrapper to catch async function exceptions
 * and pass them to the global error handler middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global Express error handling middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle Supabase/PostgREST specific database errors
  if (err.code && typeof err.code === 'string') {
    // 23505 = Unique constraint violation
    if (err.code === '23505') {
      err.statusCode = 409;
      err.message = 'Record already exists.';
    }
    // 23503 = Foreign key constraint violation
    else if (err.code === '23503') {
      err.statusCode = 400;
      err.message = 'Invalid relation reference. The referenced record does not exist.';
    }
    // 22P02 = Invalid text representation (e.g. invalid UUID format)
    else if (err.code === '22P02') {
      err.statusCode = 400;
      err.message = 'Invalid input format (e.g. invalid UUID).';
    }
  }

  // Log server errors for monitoring (500s)
  if (err.statusCode === 500) {
    console.error('SERVER ERROR 💥:', err);
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, error: err })
  });
};
