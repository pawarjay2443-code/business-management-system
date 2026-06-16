import { AppError } from './errorHandler.js';

/**
 * Basic validator helper assertions
 */
export const validate = {
  uuid: (value, fieldName = 'id') => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!value || !uuidRegex.test(value)) {
      throw new AppError(`Field '${fieldName}' must be a valid UUID.`, 400);
    }
  },

  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value || !emailRegex.test(value)) {
      throw new AppError('A valid email address is required.', 400);
    }
  },

  string: (value, fieldName, minLength = 1) => {
    if (typeof value !== 'string' || value.trim().length < minLength) {
      throw new AppError(`Field '${fieldName}' must be a string with at least ${minLength} character(s).`, 400);
    }
  },

  numberRange: (value, fieldName, min, max) => {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      throw new AppError(`Field '${fieldName}' must be a number between ${min} and ${max}.`, 400);
    }
  },

  oneOf: (value, allowedValues, fieldName) => {
    if (!allowedValues.includes(value)) {
      throw new AppError(`Field '${fieldName}' must be one of: ${allowedValues.join(', ')}. Received: '${value}'`, 400);
    }
  },

  required: (body, requiredFields) => {
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        throw new AppError(`Missing required field: '${field}'.`, 400);
      }
    }
  }
};
