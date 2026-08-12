const BANGLADESH_MOBILE_PATTERN = /^01[3-9]\d{8}$/;

/** Convert common Bangladeshi mobile formats to the API's local 01XXXXXXXXX format. */
export function normalizeBangladeshPhone(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("880")) {
    return `0${digits.slice(3)}`;
  }

  return digits;
}

export function isValidBangladeshPhone(value: string): boolean {
  return BANGLADESH_MOBILE_PATTERN.test(normalizeBangladeshPhone(value));
}
