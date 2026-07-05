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
