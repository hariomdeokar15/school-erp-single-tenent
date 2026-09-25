/**
 * Formats integer paise into INR currency display (e.g. 500000 -> ₹5,000.00).
 */
export function formatPaiseToINR(paise: number): string {
  if (typeof paise !== "number" || isNaN(paise)) {
    return "₹0.00";
  }
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Formats numbers in Indian numbering system format (e.g. 100000 -> 1,00,000).
 */
export function formatIndianNumber(value: number): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("en-IN").format(value);
}
