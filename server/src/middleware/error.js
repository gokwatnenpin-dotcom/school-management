import { ApiError } from '../lib/api-error.js';
import { config } from '../config.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Endpoint not found.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message, details: error.details });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }

  if (error.code === '23505') {
    const constraint = error.constraint || '';
    if (constraint.includes('email')) {
      return res.status(409).json({ error: 'That email address is already in use.' });
    }
    if (constraint.includes('admission_no')) {
      return res.status(409).json({ error: 'That admission number is already in use.' });
    }
    if (constraint.includes('code')) {
      return res.status(409).json({ error: 'That subject code already exists.' });
    }
    if (constraint.includes('student_id')) {
      return res.status(409).json({
        error: 'That subject is already assigned to this student for the selected term.',
      });
    }
    return res.status(409).json({ error: 'That record already exists.' });
  }

  if (error.code === '23503') {
    return res.status(409).json({ error: 'A related record is missing or still in use.' });
  }

  if (error.code === '22P02') {
    return res.status(400).json({ error: 'One of the submitted values has an invalid format.' });
  }

  console.error(error);
  res.status(500).json({
    error: config.isProduction ? 'Something went wrong. Please try again.' : error.message,
  });
}
