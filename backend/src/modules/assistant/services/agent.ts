import OpenAI from 'openai';
import type { ChatCompletion, ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { env } from '../../../config/env.js';
import { HttpError } from '../../../shared/utils/http.js';
import { dispatchAssistantTool } from './tools.js';
import type { AssistantCard } from '../types.js';

const systemPrompt = `You are the LA Illustrada hotel reservation assistant.
You can only help with four customer-facing hotel room tasks: search available rooms, prepare a room reservation, prepare cancellation of a hotel room reservation, and check a customer's hotel reservation status.
Do not handle restaurant tables, payments, invoices, staff or admin tasks, general hotel operations, or unrelated requests. Briefly explain that the request is outside your scope.
Use a tool whenever the customer asks for live availability or reservation information. Never invent rooms, prices, dates, statuses, references, or confirmations.
A reservation or cancellation is not completed when you prepare it. Tell the customer to review the confirmation card and click its confirmation button. Never claim it is booked or cancelled until the backend returns a completed result.
Booking, cancellation, and status tools require the signed-in customer account. Never ask for or accept a user ID, role, password, session token, or booking details belonging to another person.
Ask for missing dates, guest count, room choice, booking reference, or cancellation reason. Dates must be future stays of 1 to 30 nights and guest count must be 1 to 6.
Keep responses concise, warm, and precise. Use Philippine peso (₱) for all room prices, never dollar signs. Use plain text without Markdown markers such as ** or leading hyphen bullets. When a room search returns room cards, do not repeat a long room list in prose; briefly say how many options were found and ask the customer to choose from the displayed room cards. Mention that final availability is rechecked at confirmation time.`;

export const assistantTools: ChatCompletionTool[] = [
  { type: 'function', function: { name: 'search_available_rooms', description: 'Search live available hotel rooms for dates and party size.', parameters: { type: 'object', additionalProperties: false, properties: { check_in: { type: 'string', description: 'Check-in date in YYYY-MM-DD.' }, check_out: { type: 'string', description: 'Check-out date in YYYY-MM-DD.' }, guest_count: { type: 'integer', minimum: 1, maximum: 6 } }, required: ['check_in', 'check_out', 'guest_count'] } } },
  { type: 'function', function: { name: 'prepare_room_reservation', description: 'Prepare a hotel room reservation for customer review. This never creates the reservation.', parameters: { type: 'object', additionalProperties: false, properties: { room_id: { type: 'string', description: 'The exact room id returned by room search.' }, check_in: { type: 'string' }, check_out: { type: 'string' }, guest_count: { type: 'integer', minimum: 1, maximum: 6 }, special_requests: { type: 'string' } }, required: ['room_id', 'check_in', 'check_out', 'guest_count'] } } },
  { type: 'function', function: { name: 'prepare_cancel_room_reservation', description: 'Prepare cancellation of a customer hotel reservation for explicit confirmation. This never cancels the reservation.', parameters: { type: 'object', additionalProperties: false, properties: { booking_reference: { type: 'string' }, cancellation_reason: { type: 'string' } }, required: ['booking_reference', 'cancellation_reason'] } } },
  { type: 'function', function: { name: 'check_reservation_status', description: 'Check a hotel reservation belonging to the signed-in customer.', parameters: { type: 'object', additionalProperties: false, properties: { booking_reference: { type: 'string', description: 'The hotel booking reference, if the customer has it.' } }, required: [] } } },
];

type Complete = (messages: ChatCompletionMessageParam[]) => Promise<ChatCompletion.Choice>;

async function completeWithMixroute(messages: ChatCompletionMessageParam[]) {
  if (!env.MIXROUTE_API_KEY) throw new HttpError(503, 'The hotel assistant is not configured yet.');
  const client = new OpenAI({ apiKey: env.MIXROUTE_API_KEY, baseURL: env.MIXROUTE_BASE_URL });
  try {
    const response = await client.chat.completions.create({
      model: env.MIXROUTE_MODEL,
      messages,
      tools: assistantTools,
      tool_choice: 'auto',
      temperature: 0.1,
    }, { timeout: 15000 });
    if (!response.choices[0]) throw new Error('MixRoute returned no assistant choice.');
    return response.choices[0];
  } catch {
    throw new HttpError(502, 'The hotel assistant is temporarily unavailable. Please try again.');
  }
}

export async function runAssistant(input: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  user: Express.Request['user'];
  complete?: Complete;
}) {
  const complete = input.complete ?? completeWithMixroute;
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...input.history.map((item) => ({ role: item.role, content: item.content }) satisfies ChatCompletionMessageParam),
    { role: 'user', content: input.message },
  ];
  const cards: AssistantCard[] = [];
  const activity = ['Understanding your request'];
  const addActivity = (step: string) => {
    if (!activity.includes(step)) activity.push(step);
  };
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const choice = await complete(messages);
    const message = choice.message;
    messages.push(message);
    if (!message.tool_calls?.length) {
      addActivity('Preparing a response');
      return { reply: message.content?.trim() || 'Please tell me whether you want to search, book, cancel, or check a hotel room reservation.', cards, activity };
    }
    for (const call of message.tool_calls) {
      let result: string;
      try {
        if (call.type !== 'function') throw new HttpError(400, 'That assistant action is not supported.');
        const activityByTool: Record<string, string> = {
          search_available_rooms: 'Checking live room availability',
          prepare_room_reservation: 'Preparing a secure booking summary',
          prepare_cancel_room_reservation: 'Checking cancellation eligibility',
          check_reservation_status: 'Checking your reservation status',
        };
        addActivity(activityByTool[call.function.name] ?? 'Validating the requested action');
        const args = JSON.parse(call.function.arguments || '{}') as unknown;
        const toolResult = await dispatchAssistantTool(call.function.name, args, input.user);
        if (toolResult.card) cards.push(toolResult.card);
        result = JSON.stringify({ ok: true, ...toolResult.data });
      } catch (error) {
        result = JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'The request could not be completed.' });
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }
  addActivity('Preparing a response');
  return { reply: 'I could not complete that request. Please try again with the exact stay dates or booking reference.', cards, activity };
}

export const assistantSystemPrompt = systemPrompt;
