export function calculateHotelTotals(subtotal: number, taxRate: number, serviceFeeRate: number) {
  const base = Math.round(subtotal * 100) / 100;
  const tax = Math.round(base * (taxRate / 100) * 100) / 100;
  const serviceFee = Math.round(base * (serviceFeeRate / 100) * 100) / 100;
  return { subtotal: base, tax, serviceFee, total: Math.round((base + tax + serviceFee) * 100) / 100 };
}
