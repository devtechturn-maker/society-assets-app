import type { FlatNumberFormat } from '../types/api';

export const MAX_BUILDINGS = 50;
export const MAX_FLATS = 5000;

function buildingLabel(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  return `B${index + 1}`;
}

function bestUnitsPerFloor(perBuilding: number): number {
  if (perBuilding <= 1) return 1;
  for (const candidate of [4, 3, 5, 2, 6]) {
    if (perBuilding % candidate === 0) return candidate;
  }
  return Math.min(4, perBuilding);
}

function resolveUnitsPerFloor(
  format: FlatNumberFormat,
  perBuilding: number,
  flatsPerFloor?: number | null
): number {
  if (format === 'SEQUENTIAL') return 0;
  if (format === 'CUSTOM') {
    const n = flatsPerFloor ?? 0;
    if (n < 1 || n > 50) {
      throw new Error('Flats per floor must be between 1 and 50');
    }
    if (perBuilding % n !== 0) {
      throw new Error(
        `Each building has ${perBuilding} flats, which must divide evenly by flats per floor (${n}).`
      );
    }
    return n;
  }
  return bestUnitsPerFloor(perBuilding);
}

export function generateFlatNumbers(
  buildings: number,
  totalFlats: number,
  format: FlatNumberFormat,
  flatsPerFloor?: number | null
): string[] {
  if (format === 'EXPLICIT') {
    return [];
  }
  if (buildings < 1 || totalFlats < 1 || totalFlats % buildings !== 0) {
    return [];
  }
  let unitsPerFloor = 0;
  try {
    unitsPerFloor = resolveUnitsPerFloor(format, totalFlats / buildings, flatsPerFloor);
  } catch {
    return [];
  }

  const perBuilding = totalFlats / buildings;
  const numbers: string[] = [];
  for (let b = 0; b < buildings; b++) {
    const prefix = buildings > 1 ? `${buildingLabel(b)}-` : '';
    if (format === 'SEQUENTIAL') {
      for (let i = 1; i <= perBuilding; i++) {
        numbers.push(`${prefix}${i}`);
      }
    } else {
      let assigned = 0;
      let floor = 1;
      while (assigned < perBuilding) {
        for (let unit = 1; unit <= unitsPerFloor && assigned < perBuilding; unit++) {
          numbers.push(`${prefix}${floor * 100 + unit}`);
          assigned++;
        }
        floor++;
      }
    }
  }
  return numbers;
}

export function normalizeExplicitFlatNumbers(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const flat = entry.trim().toUpperCase();
    if (!flat) continue;
    if (seen.has(flat)) continue;
    seen.add(flat);
    out.push(flat);
  }
  return out;
}

export function explicitFlatsValidationMessage(raw: string[]): string | null {
  const normalized = normalizeExplicitFlatNumbers(raw);
  if (normalized.length < 1) return 'Add at least one flat number.';
  if (normalized.length > MAX_FLATS) return `Flats cannot exceed ${MAX_FLATS}.`;
  const lower = raw.map((r) => r.trim().toUpperCase()).filter(Boolean);
  if (lower.length !== new Set(lower).size) {
    return 'Duplicate flat numbers are not allowed.';
  }
  return null;
}

export function flatsValidationMessage(buildings: number, totalFlats: number): string | null {
  if (buildings < 1) return 'Enter number of buildings.';
  if (totalFlats < 1) return 'Enter number of flats.';
  if (totalFlats > MAX_FLATS) return `Flats cannot exceed ${MAX_FLATS}.`;
  if (buildings > MAX_BUILDINGS) return `Buildings cannot exceed ${MAX_BUILDINGS}.`;
  if (totalFlats % buildings !== 0) {
    return 'Total flats must divide evenly across buildings.';
  }
  return null;
}

export function customFormatValidationMessage(
  buildings: number,
  totalFlats: number,
  flatsPerFloor: number
): string | null {
  const base = flatsValidationMessage(buildings, totalFlats);
  if (base) return base;
  if (flatsPerFloor < 1 || flatsPerFloor > 50) {
    return 'Flats per floor must be between 1 and 50.';
  }
  const perBuilding = totalFlats / buildings;
  if (perBuilding % flatsPerFloor !== 0) {
    return (
      `Each building has ${perBuilding} flats. ` +
      `Use a flats-per-floor value that divides ${perBuilding} evenly ` +
      `(e.g. 4 → floors 101–104, 201–204).`
    );
  }
  return null;
}

export function formatExampleLine(numbers: string[]): string {
  if (numbers.length === 0) return '—';
  if (numbers.length === 1) return numbers[0];
  if (numbers.length <= 4) return numbers.join(', ');
  return `${numbers[0]} … ${numbers[numbers.length - 1]}`;
}

/** One building in custom (EXPLICIT) flat configuration. */
export type BuildingFlatDraft = {
  id: string;
  name: string;
  totalFlats: number;
  /** Numeric flat numbers only (digits), length matches totalFlats. */
  flatNumbers: string[];
};

export function createBuildingDraft(name = '', totalFlats = 0): BuildingFlatDraft {
  const count = Math.max(0, Math.min(totalFlats, MAX_FLATS));
  return {
    id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    totalFlats: count,
    flatNumbers: Array.from({ length: count }, () => ''),
  };
}

/** Resize flat input list: keep existing values, trim from end, append blanks. */
export function resizeFlatNumberList(current: string[], nextCount: number): string[] {
  const n = Math.max(0, Math.min(nextCount, MAX_FLATS));
  if (n === current.length) return current;
  if (n < current.length) return current.slice(0, n);
  return [...current, ...Array.from({ length: n - current.length }, () => '')];
}

export function isDigitsOnlyFlat(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/**
 * Society-wide flat key. Single building → digits only; multiple → BUILDING-DIGITS
 * (matches existing A-101 style uniqueness).
 */
export function composeSocietyFlatKey(buildingName: string, flatDigits: string, multiBuilding: boolean): string {
  const digits = flatDigits.trim();
  if (!multiBuilding) return digits;
  return `${buildingName.trim().toUpperCase()}-${digits}`;
}

export function validateBuildingFlatDrafts(buildings: BuildingFlatDraft[]): string | null {
  if (buildings.length < 1) return 'Add at least one building / block.';
  if (buildings.length > MAX_BUILDINGS) return `Buildings cannot exceed ${MAX_BUILDINGS}.`;

  const nameKeys = new Set<string>();
  let total = 0;

  for (const building of buildings) {
    const name = building.name.trim();
    if (!name) return 'Building / block name cannot be empty.';
    const nameKey = name.toUpperCase();
    if (nameKeys.has(nameKey)) {
      return `Duplicate building name: ${name}`;
    }
    nameKeys.add(nameKey);

    if (building.totalFlats < 1) {
      return `Enter total flats for building ${name}.`;
    }
    if (building.flatNumbers.length !== building.totalFlats) {
      return `Flat inputs for ${name} do not match total flats.`;
    }

    const seenInBuilding = new Set<string>();
    for (let i = 0; i < building.flatNumbers.length; i++) {
      const raw = building.flatNumbers[i]?.trim() ?? '';
      if (!raw) {
        return `Enter flat number ${i + 1} for building ${name}.`;
      }
      if (!isDigitsOnlyFlat(raw)) {
        return `Flat numbers must be digits only (building ${name}, flat ${i + 1}).`;
      }
      if (seenInBuilding.has(raw)) {
        return `Flat number ${raw} is already used in Building ${name}.`;
      }
      seenInBuilding.add(raw);
    }
    total += building.totalFlats;
  }

  if (total > MAX_FLATS) return `Flats cannot exceed ${MAX_FLATS}.`;

  const multi = buildings.length > 1;
  const societyKeys = new Set<string>();
  for (const building of buildings) {
    for (const digits of building.flatNumbers) {
      const key = composeSocietyFlatKey(building.name, digits, multi).toUpperCase();
      if (societyKeys.has(key)) {
        return `Duplicate flat ${key} across the society.`;
      }
      societyKeys.add(key);
    }
  }

  return null;
}

export function flattenBuildingFlats(buildings: BuildingFlatDraft[]): string[] {
  const multi = buildings.length > 1;
  const out: string[] = [];
  for (const building of buildings) {
    for (const digits of building.flatNumbers) {
      out.push(composeSocietyFlatKey(building.name, digits.trim(), multi));
    }
  }
  return out;
}
