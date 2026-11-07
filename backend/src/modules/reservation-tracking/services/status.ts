export const transitions: Record<string, Record<string, string[]>> = {
  hotel: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['checked_in', 'cancelled', 'no_show'],
    checked_in: ['checked_out'],
  },
  restaurant: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['arrived', 'cancelled', 'no_show'],
    arrived: ['seated', 'cancelled'],
    seated: ['completed'],
  },
};
export function allowedActions(type: string, status: string, role: string) {
  const actions = transitions[type]?.[status] ?? [];
  return role === 'customer' ? actions.filter((a) => a === 'confirmed' || a === 'cancelled') : actions;
}
