export function parseAmount(input: string, decimals: number): number {
  const [whole = '0', decimal = ''] = input.split('.');
  const padded = decimal.padEnd(decimals, '0').slice(0, decimals);
  return parseInt((whole || '0') + padded, 10);
}

export function formatAmount(units: number, decimals: number): string {
  if (decimals === 0) return String(units);
  const divisor = 10 ** decimals;
  const whole = Math.floor(units / divisor);
  const frac = String(units % divisor).padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : String(whole);
}
