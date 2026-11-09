export function pluralize(count: number, singular: string, plural?: string): string {
  const p = plural || `${singular}s`;
  return `${count} ${count === 1 ? singular : p}`;
}

export function formatCount(count: number | string, singular: string, plural?: string): string {
  const num = typeof count === "string" ? parseInt(count, 10) : count;
  if (isNaN(num)) return `${count} ${plural || `${singular}s`}`;
  const p = plural || `${singular}s`;
  return `${count} ${num === 1 ? singular : p}`;
}
