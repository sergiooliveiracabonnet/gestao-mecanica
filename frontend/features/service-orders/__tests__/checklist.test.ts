import { describe, expect, it } from 'vitest';
import { DEFAULT_INSPECTION_ITEMS, parseChecklist, serializeChecklist } from '../checklist';

describe('service order checklist adapter', () => {
  it('creates a stable inspection checklist when no value exists', () => {
    expect(parseChecklist(undefined)).toEqual(DEFAULT_INSPECTION_ITEMS);
  });

  it('reads the structured format and ignores invalid statuses', () => {
    expect(parseChecklist({ items: [{ id: 'brakes', label: 'Freios', status: 'broken', note: 7 }] })).toEqual([
      { id: 'brakes', label: 'Freios', status: 'unchecked', note: '' },
    ]);
  });

  it('keeps legacy boolean and note values readable', () => {
    expect(parseChecklist({ Freios: true, Pneus: 'Calibrar' })).toEqual([
      { id: 'legacy-1', label: 'Freios', status: 'ok', note: '' },
      { id: 'legacy-2', label: 'Pneus', status: 'attention', note: 'Calibrar' },
    ]);
  });

  it('serializes only the fields the backend needs', () => {
    expect(serializeChecklist([{ id: 'brakes', label: 'Freios', status: 'critical', note: 'Trocar' }])).toEqual({
      version: 1,
      items: [{ id: 'brakes', label: 'Freios', status: 'critical', note: 'Trocar' }],
    });
  });
});
