export function displayMerchantName(t: {
  display_name?: string | null;
  merchant_name: string | null;
}): string {
  return t.display_name ?? t.merchant_name ?? "Unknown";
}
