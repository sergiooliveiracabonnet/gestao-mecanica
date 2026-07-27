import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InspectionChecklist } from '../InspectionChecklist';
import { DEFAULT_INSPECTION_ITEMS } from '../../checklist';

describe('InspectionChecklist', () => {
  it('keeps the selected inspection status visually and accessibly pressed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = render(<InspectionChecklist items={DEFAULT_INSPECTION_ITEMS} onChange={onChange} />);

    const okButton = screen.getAllByRole('button', { name: /^Está bom$/i })[0];
    await user.click(okButton);
    view.rerender(<InspectionChecklist items={onChange.mock.calls[0][0]} onChange={onChange} />);

    expect(okButton).toHaveAttribute('aria-pressed', 'true');
    expect(okButton).toHaveAttribute('title', 'Está bom — selecionado');
    expect(okButton.className).toContain('bg-success-subtle');
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'fluids', status: 'ok' }),
    ]));
  });
});
