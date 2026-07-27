import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

describe('design system primitives', () => {
  it('announces and blocks a loading button while preserving its label', () => {
    render(<Button loading>Salvar alterações</Button>);

    const button = screen.getByRole('button', { name: /salvar alterações/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies the invalid field contract from aria-invalid', () => {
    render(<Input aria-label="Placa" aria-invalid="true" />);

    expect(screen.getByRole('textbox', { name: 'Placa' })).toHaveClass('border-danger');
  });

  it.each(['info', 'attention', 'success', 'critical', 'neutral'] as const)(
    'exposes the %s operational badge variant',
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);

      expect(screen.getByText(variant)).toHaveAttribute('data-variant', variant);
    },
  );
});
