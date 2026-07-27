'use client';

import { forwardRef, useEffect, useId, useState, type ComponentPropsWithoutRef, type KeyboardEvent } from 'react';
import type { VehicleListItemResponse } from '@oficina/contracts';
import { Input } from '@/components/ui/input';
import { useVehiclesList } from '@/features/vehicles/hooks/use-vehicles';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const RESULTS_LIMIT = 20;

interface VehicleSearchComboboxProps extends Omit<ComponentPropsWithoutRef<typeof Input>, 'value' | 'onChange' | 'type' | 'role'> {
  value: string;
  onChange: (vehicleId: string) => void;
  customerId?: string;
  initialLabel?: string;
}

function vehicleLabel(vehicle: VehicleListItemResponse): string {
  return `${vehicle.brand} ${vehicle.model} · ${vehicle.plate} — ${vehicle.customerName}`;
}

// Sem lib de combobox nova (mesma restrição pragmática já aceita na Feature 4)
// — input simples + lista de resultados posicionada por baixo. Aceita
// ...rest/ref pra funcionar dentro de <FormControl> (id/aria-describedby/
// aria-invalid vêm do Slot do shadcn, mesmo padrão de FipeBrandModelFields).
export const VehicleSearchCombobox = forwardRef<HTMLInputElement, VehicleSearchComboboxProps>(function VehicleSearchCombobox(
  { value, onChange, placeholder, customerId, initialLabel, ...rest },
  ref,
) {
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [confirmedLabel, setConfirmedLabel] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Reseta o texto exibido quando o form limpa o campo externamente (ex:
  // reabrir o modal) — não reage a toda mudança de `value`, só quando ele
  // volta a vazio, senão apagaria o texto digo logo após uma seleção.
  useEffect(() => {
    if (value === '') {
      setQuery('');
      setConfirmedLabel('');
    } else if (initialLabel) {
      setQuery(initialLabel);
      setConfirmedLabel(initialLabel);
    }
  }, [value, initialLabel]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  const isEditingAfterSelection = query !== confirmedLabel;
  const canSearch = debouncedQuery.length >= MIN_SEARCH_LENGTH && isEditingAfterSelection;

  // `matchOwner: true` — só este combobox (abertura de OS) casa a busca
  // também pelo nome/documento do cliente dono; a tela de Veículos usa
  // useVehiclesList sem essa flag e mantém a busca original (ver
  // VehicleListRequest.matchOwner).
  const { data, isFetching } = useVehiclesList(
    { offset: 0, limit: RESULTS_LIMIT, search: debouncedQuery, customerId, matchOwner: true },
    { enabled: canSearch && isOpen },
  );

  const results = data?.items ?? [];

  useEffect(() => {
    setHighlightedIndex(results.length > 0 ? 0 : -1);
  }, [results.length, debouncedQuery]);

  function handleQueryChange(newQuery: string) {
    setQuery(newQuery);
    setIsOpen(true);
    if (newQuery !== confirmedLabel) {
      onChange('');
    }
  }

  function handleSelect(vehicle: VehicleListItemResponse) {
    const label = vehicleLabel(vehicle);
    setQuery(label);
    setConfirmedLabel(label);
    setIsOpen(false);
    onChange(vehicle.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        event.preventDefault();
        handleSelect(results[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        {...rest}
        ref={ref}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
        placeholder={placeholder ?? 'Nome, CPF ou placa do veículo...'}
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && canSearch && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-button border border-input bg-background shadow-md"
        >
          {isFetching && <li className="px-3 py-2 text-sm text-muted-foreground">Buscando...</li>}
          {!isFetching && results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum veículo encontrado</li>}
          {!isFetching &&
            results.map((vehicle, index) => (
              <li key={vehicle.id}>
                <button
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent ${index === highlightedIndex ? 'bg-accent' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(vehicle)}
                >
                  {vehicleLabel(vehicle)}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
});
