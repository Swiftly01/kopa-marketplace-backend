export function redactDestination(value: string): string {
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    const visible = local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
  }

  if (value.length <= 6) return '*'.repeat(value.length);

  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}
