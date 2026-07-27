export type InspectionStatus = 'unchecked' | 'ok' | 'attention' | 'critical' | 'na';

export interface InspectionItem {
  id: string;
  label: string;
  status: InspectionStatus;
  note: string;
}

export const DEFAULT_INSPECTION_ITEMS: InspectionItem[] = [
  { id: 'fluids', label: 'Níveis de fluidos', status: 'unchecked', note: '' },
  { id: 'brakes', label: 'Freios e pastilhas', status: 'unchecked', note: '' },
  { id: 'tires', label: 'Pneus e calibragem', status: 'unchecked', note: '' },
  { id: 'lights', label: 'Iluminação e sinalização', status: 'unchecked', note: '' },
  { id: 'battery', label: 'Bateria e partida', status: 'unchecked', note: '' },
  { id: 'suspension', label: 'Suspensão e direção', status: 'unchecked', note: '' },
];

const VALID_STATUSES: InspectionStatus[] = ['unchecked', 'ok', 'attention', 'critical', 'na'];

export function parseChecklist(value: Record<string, unknown> | undefined): InspectionItem[] {
  if (!value || typeof value !== 'object') {
    return DEFAULT_INSPECTION_ITEMS.map((item) => ({ ...item }));
  }

  if (Array.isArray(value.items)) {
    const parsed = value.items.flatMap((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        return [];
      }
      const item = raw as Record<string, unknown>;
      const fallback = DEFAULT_INSPECTION_ITEMS[index];
      const status = typeof item.status === 'string' && VALID_STATUSES.includes(item.status as InspectionStatus) ? item.status as InspectionStatus : 'unchecked';
      return [{
        id: typeof item.id === 'string' ? item.id : fallback?.id ?? `item-${index + 1}`,
        label: typeof item.label === 'string' ? item.label : fallback?.label ?? `Item ${index + 1}`,
        status,
        note: typeof item.note === 'string' ? item.note : '',
      }];
    });
    return parsed.length > 0 ? parsed : DEFAULT_INSPECTION_ITEMS.map((item) => ({ ...item }));
  }

  // Compatibilidade com o formato anterior: { "Freios": true } ou
  // { "Freios": "trocar pastilhas" }.
  const legacyItems = Object.entries(value).flatMap(([label, raw], index) => {
    if (typeof raw !== 'boolean' && typeof raw !== 'string') {
      return [];
    }
    return [{
      id: `legacy-${index + 1}`,
      label,
      status: raw === true ? 'ok' as const : raw === false ? 'attention' as const : 'attention' as const,
      note: typeof raw === 'string' ? raw : '',
    }];
  });
  return legacyItems.length > 0 ? legacyItems : DEFAULT_INSPECTION_ITEMS.map((item) => ({ ...item }));
}

export function serializeChecklist(items: InspectionItem[]): Record<string, unknown> {
  return {
    version: 1,
    items: items.map(({ id, label, status, note }) => ({ id, label, status, ...(note.trim() ? { note: note.trim() } : {}) })),
  };
}
