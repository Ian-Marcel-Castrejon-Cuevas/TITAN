export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "";

  const text = value instanceof Date ? value.toISOString() : String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  if (match) return `${match[1]} ${match[2]}`;

  return text.replace(/\.\d{1,9}(?=Z$|[+-]\d{2}:?\d{2}$)/, "").replace(/Z$/, "");
}
