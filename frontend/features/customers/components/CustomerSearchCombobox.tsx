'use client';

import { forwardRef, useEffect, useId, useState, type ComponentPropsWithoutRef, type KeyboardEvent } from 'react';
import type { CustomerListItemResponse } from '@oficina/contracts';
import { Input } from '@/components/ui/input';
import { useCustomersList } from '../hooks/use-customers';

const SEARCH_DEBOUNCE_MS = 250;

interface CustomerSearchComboboxProps extends Omit<ComponentPropsWithoutRef<typeof Input>, 'value' | 'onChange' | 'type' | 'role'> {
  value: string;
  onChange: (customerId: string, customer?: CustomerListItemResponse) => void;
  initialLabel?: string;
}

export const CustomerSearchCombobox = forwardRef<HTMLInputElement, CustomerSearchComboboxProps>(function CustomerSearchCombobox({ value, onChange, placeholder, initialLabel, ...rest }, ref) {
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [confirmedLabel, setConfirmedLabel] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    if (!value) { setQuery(''); setConfirmedLabel(''); }
    else if (initialLabel) { setQuery(initialLabel); setConfirmedLabel(initialLabel); }
  }, [value, initialLabel]);
  useEffect(() => { const timeout = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS); return () => clearTimeout(timeout); }, [query]);

  const canSearch = debouncedQuery.length >= 2 && query !== confirmedLabel;
  const { data, isFetching } = useCustomersList({ offset: 0, limit: 20, search: debouncedQuery }, { enabled: canSearch && isOpen });
  const results = canSearch ? data?.items ?? [] : [];

  useEffect(() => { setHighlightedIndex(results.length ? 0 : -1); }, [results.length, debouncedQuery]);

  function select(customer: CustomerListItemResponse) {
    setQuery(customer.name); setConfirmedLabel(customer.name); setIsOpen(false); onChange(customer.id, customer);
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || !results.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setHighlightedIndex((index) => (index + 1) % results.length); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setHighlightedIndex((index) => (index - 1 + results.length) % results.length); }
    if (event.key === 'Enter' && highlightedIndex >= 0) { event.preventDefault(); select(results[highlightedIndex]); }
    if (event.key === 'Escape') setIsOpen(false);
  }

  return <div className="relative"><Input {...rest} ref={ref} role="combobox" aria-expanded={isOpen} aria-controls={listboxId} aria-autocomplete="list" placeholder={placeholder ?? 'Buscar por nome, CPF ou CNPJ'} value={query} onChange={(event) => { setQuery(event.target.value); setIsOpen(true); if (event.target.value !== confirmedLabel) onChange(''); }} onFocus={() => setIsOpen(true)} onBlur={() => setTimeout(() => setIsOpen(false), 150)} onKeyDown={onKeyDown} />{isOpen && canSearch && <ul id={listboxId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-button border border-input bg-background shadow-md">{isFetching && <li className="px-3 py-2 text-sm text-muted-foreground">Buscando clientes...</li>}{!isFetching && !results.length && <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</li>}{!isFetching && results.map((customer, index) => <li key={customer.id}><button type="button" role="option" aria-selected={index === highlightedIndex} className={`block w-full px-3 py-2 text-left text-sm hover:bg-selection ${index === highlightedIndex ? 'bg-selection' : ''}`} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => select(customer)}>{customer.name}<span className="ml-2 text-xs text-text-muted">{customer.document}</span></button></li>)}</ul>}</div>;
});
