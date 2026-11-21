import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { requireUser } from '../../../middleware/auth.js';
import { route, text, uuid, HttpError } from '../../../shared/utils/http.js';
import { confirmAssistantIntent } from '../services/tools.js';
import { runAssistant } from '../services/agent.js';

export const assistantRouter = Router();
const assistantLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many assistant requests. Please wait a few minutes and try again.' },
});
const chatSchema = z.object({
  message: text(2000).min(1),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: text(4000) })).max(20).default([]),
}).strict();

assistantRouter.post(
  '/chat',
  assistantLimit,
  route(async (req, res) => {
    const data = chatSchema.parse(req.body);
    const result = await runAssistant({ message: data.message, history: data.history, user: req.user });
    res.json(result);
  }),
);

assistantRouter.post(
  '/confirm',
  requireUser,
  route(async (req, res) => {
    if (req.user!.role !== 'customer') throw new HttpError(403, 'This assistant is available for customer reservations only.');
    const data = z.object({ intent_id: uuid }).strict().parse(req.body);
    const result = await confirmAssistantIntent(data.intent_id, req.user);
    res.json({ ok: true, ...result });
  }),
);
