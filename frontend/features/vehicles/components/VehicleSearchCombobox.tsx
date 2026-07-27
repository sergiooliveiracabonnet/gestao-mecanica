'use client';

import { forwardRef, useEffect, useId, useState, type ComponentPropsWithoutRef } from 'react';
import { Input } from '@/components/ui/input';
import { useVehiclesList } from '@/features/vehicles/hooks/use-vehicles';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const RESULTS_LIMIT = 20;

interface VehicleSearchComboboxProps extends Omit<ComponentPropsWithoutRef<typeof Input>, 'value' | 'onChange' | 'type' | 'role'> {
  value: string;
  onChange: (vehicleId: string) => void;
}

function vehicleLabel(vehicle: { brand: string; model: string; plate: string; customerName: string }): string {
  return `${vehicle.brand} ${vehicle.model} · ${vehicle.plate} — ${vehicle.customerName}`;
}

// Sem lib de combobox nova (mesma restrição pragmática já aceita na Feature 4)
// — input simples + lista de resultados posicionada por baixo. Aceita
// ...rest/ref pra funcionar dentro de <FormControl> (id/aria-describedby/
// aria-invalid vêm do Slot do shadcn, mesmo padrão de FipeBrandModelFields).
export const VehicleSearchCombobox = forwardRef<HTMLInputElement, VehicleSearchComboboxProps>(function VehicleSearchCombobox(
  { value, onChange, placeholder, ...rest },
  ref,
) {
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [confirmedLabel, setConfirmedLabel] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Reseta o texto exibido quando o form limpa o campo externamente (ex:
  // reabrir o modal) — não reage a toda mudança de `value`, só quando ele
  // volta a vazio, senão apagaria o texto digo logo após uma seleção.
  useEffect(() => {
    if (value === '') {
      setQuery('');
      setConfirmedLabel('');
    }
  }, [value]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  const isEditingAfterSelection = query !== confirmedLabel;
  const canSearch = debouncedQuery.length >= MIN_SEARCH_LENGTH && isEditingAfterSelection;

  const { data, isFetching } = useVehiclesList(
    { offset: 0, limit: RESULTS_LIMIT, search: debouncedQuery },
    { enabled: canSearch && isOpen },
  );

  const results = data?.items ?? [];

  function handleQueryChange(newQuery: string) {
    setQuery(newQuery);
    setIsOpen(true);
    if (newQuery !== confirmedLabel) {
      onChange('');
    }
  }

  function handleSelect(vehicle: { id: string; brand: string; model: string; plate: string; customerName: string }) {
    const label = vehicleLabel(vehicle);
    setQuery(label);
    setConfirmedLabel(label);
    setIsOpen(false);
    onChange(vehicle.id);
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
        placeholder={placeholder ?? 'Nome, CPF ou placa do veículo...'}
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
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
            results.map((vehicle) => (
              <li key={vehicle.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(event) => event.preventDefault()}
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
