import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../shared/utils/http.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ZodError) {
    response
      .status(400)
      .json({ error: error.issues.map((i) => `${i.path.join('.') || 'Input'}: ${i.message}`).join('; ') });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    response.status(409).json({ error: 'That email, room number, or transaction reference already exists.' });
    return;
  }
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  if (typeof error === 'object' && error !== null && 'status' in error && error.status === 413) {
    response.status(413).json({ error: 'Request body too large' });
    return;
  }
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
};
