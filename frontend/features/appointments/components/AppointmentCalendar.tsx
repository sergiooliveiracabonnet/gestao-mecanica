'use client';

import type { AppointmentResponse, AppointmentStatus } from '@oficina/contracts';
import { addDays, sameDay, startOfDay, startOfWeek } from '../calendar/date-utils';

export type CalendarView = 'DAY' | 'WEEK' | 'MONTH';

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  SCHEDULED: 'border-border-strong bg-muted text-text',
  CONFIRMED: 'border-info/30 bg-info-subtle text-info-strong',
  IN_SERVICE: 'border-primary/30 bg-primary-subtle text-primary-strong',
  COMPLETED: 'border-success/30 bg-success-subtle text-success-strong',
  CANCELLED: 'border-border bg-surface text-text-muted line-through',
  NO_SHOW: 'border-danger/30 bg-danger-subtle text-danger-strong',
};

export function AppointmentCalendar({ date, view, items, loading, onSelect, onCreate }: {
  date: Date;
  view: CalendarView;
  items: AppointmentResponse[];
  loading: boolean;
  onSelect: (item: AppointmentResponse) => void;
  onCreate: (date: Date) => void;
}) {
  if (loading) return <div className="h-[32rem] animate-pulse rounded-card border border-border bg-muted" aria-label="Carregando agenda" />;
  if (view === 'MONTH') return <MonthGrid date={date} items={items} onSelect={onSelect} onCreate={onCreate} />;
  const days = view === 'DAY' ? [startOfDay(date)] : Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));
  return <div className="overflow-hidden rounded-card border border-border bg-card">
    <div className={`grid border-b border-border bg-surface ${view === 'DAY' ? 'grid-cols-1' : 'grid-cols-7'}`}>{days.map((day) => <div key={day.toISOString()} className="p-3 text-center"><span className="block text-xs font-semibold uppercase text-text-muted">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</span><span className={`mt-1 inline-flex size-8 items-center justify-center rounded-full text-sm font-bold ${sameDay(day, new Date()) ? 'bg-primary text-primary-foreground' : 'text-text'}`}>{day.getDate()}</span></div>)}</div>
    <div className={`grid min-h-[34rem] ${view === 'DAY' ? 'grid-cols-1' : 'grid-cols-7'}`}>{days.map((day) => {
      const dayItems = items.filter((item) => sameDay(new Date(item.startsAt), day));
      return <button key={day.toISOString()} type="button" onClick={() => { const selected = new Date(day); selected.setHours(8, 0); onCreate(selected); }} className="min-w-0 border-r border-border p-2 text-left last:border-r-0 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <div className="space-y-2">{dayItems.map((item) => <Event key={item.id} item={item} onSelect={onSelect} />)}</div>
        {dayItems.length === 0 && <span className="block p-2 text-center text-xs text-text-subtle">Livre</span>}
      </button>;
    })}</div>
  </div>;
}

function MonthGrid({ date, items, onSelect, onCreate }: { date: Date; items: AppointmentResponse[]; onSelect: (item: AppointmentResponse) => void; onCreate: (date: Date) => void }) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  return <div className="grid grid-cols-7 overflow-hidden rounded-card border border-border bg-card">{days.map((day) => {
    const dayItems = items.filter((item) => sameDay(new Date(item.startsAt), day));
    return <button key={day.toISOString()} type="button" onClick={() => { const selected = new Date(day); selected.setHours(8); onCreate(selected); }} className="min-h-28 border-b border-r border-border p-2 text-left hover:bg-surface">
      <span className={`text-xs font-bold ${day.getMonth() === date.getMonth() ? 'text-text' : 'text-text-subtle'}`}>{day.getDate()}</span>
      <div className="mt-2 space-y-1">{dayItems.slice(0, 3).map((item) => <Event key={item.id} item={item} onSelect={onSelect} compact />)}{dayItems.length > 3 && <span className="text-xs text-text-muted">+{dayItems.length - 3}</span>}</div>
    </button>;
  })}</div>;
}

function Event({ item, onSelect, compact = false }: { item: AppointmentResponse; onSelect: (item: AppointmentResponse) => void; compact?: boolean }) {
  const time = new Date(item.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return <span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onSelect(item); }} onKeyDown={(event) => { if (event.key === 'Enter') onSelect(item); }} className={`block cursor-pointer rounded-button border p-2 text-xs ${STATUS_STYLES[item.status]}`}>
    <span className="font-bold">{time} {!compact && item.customerName}</span>{!compact && <><span className="mt-0.5 block truncate">{item.vehiclePlate} · {item.serviceDescription}</span><span className="mt-1 block truncate opacity-75">{item.technicianName ?? 'Sem técnico'}</span></>}
  </span>;
}
