/**
 * Society units are flats or shops. Shops are stored as "SHOP A-101" so a shop can share its number with a flat.
 */
const SHOP_PREFIX = /^SHOP\s+/i;

export function isShopUnit(unitNumber?: string | null): boolean {
  return SHOP_PREFIX.test((unitNumber ?? '').trim());
}

/** "A-101" -> "Flat A-101", "SHOP A-101" -> "Shop A-101". */
export function unitName(unitNumber?: string | null): string {
  const value = (unitNumber ?? '').trim();
  if (!value) return 'Flat —';
  return isShopUnit(value) ? `Shop ${value.replace(SHOP_PREFIX, '')}` : `Flat ${value}`;
}

/** Number as typed by the office: "Shop" + number for shops (the server normalises it to "SHOP A-101"). */
export function unitNumberFor(kind: 'FLAT' | 'SHOP', number: string): string {
  const n = number.trim().replace(SHOP_PREFIX, '');
  return kind === 'SHOP' ? `Shop ${n}` : n;
}
