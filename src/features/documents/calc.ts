export type LineInput = {
  quantity: number;
  unitPrice: number;
  discount: number;
};

export function lineTotal(item: LineInput) {
  const gross = item.quantity * item.unitPrice;
  return Math.max(0, gross - item.discount);
}

export function calcTotals(items: LineInput[], vatRate = 17) {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const vatAmount = Math.round(subtotal * (vatRate / 100));
  const total = subtotal + vatAmount;
  return { subtotal, vatAmount, total, vatRate };
}
