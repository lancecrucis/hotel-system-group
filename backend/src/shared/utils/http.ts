import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const uuid = z.uuid();
export const text = (max = 500) => z.string().trim().max(max);
export const date = z.iso.date();
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM time');
export const money = z
  .number()
  .positive()
  .max(1000000)
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, 'Use at most two decimal places');
export function route(fn: (request: Request, response: Response) => Promise<unknown>) {
  return (request: Request, response: Response, next: NextFunction) => {
    void fn(request, response).catch(next);
  };
}
