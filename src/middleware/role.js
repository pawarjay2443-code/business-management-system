import { AppError } from '../utils/errorHandler.js';

/**
 * Role middleware factory that restricts access to endpoints by user role.
 * Admins are always permitted bypass access for simplicity unless specified.
 * 
 * Allowed internal mapping:
 * - Super Admin -> 'Admin'
 * - Business Manager -> 'Manager'
 * - Project Manager -> 'Manager' or 'Team Lead'
 * - Team Lead -> 'Team Lead'
 * - HR Manager -> 'HR'
 * - Employee -> 'Employee'
 * 
 * @param {string[]} allowedRoles - List of schema roles allowed (e.g., ['Admin', 'HR', 'Manager'])
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication context missing.', 401));
    }

    const userRole = req.user.role;

    // Super Admins ('Admin') bypass all checks
    if (userRole === 'Admin') {
      return next();
    }

    // Translate/verify if role matches allowed list
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return next(new AppError('Access denied. You do not have permission to perform this action.', 403));
  };
};
