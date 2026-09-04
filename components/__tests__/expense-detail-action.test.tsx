import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseDetailAction } from '../expense-detail-action';
import type { Expense } from '@/types/funds';

const baseExpense = {
  id: 'expense-1',
  category_id: 'cat-1',
  period_id: 'period-1',
  date: '2026-07-01',
  payment_method: 'debit' as const,
  description: 'mercado',
  amount: 601436,
} as Expense;

const renderAction = (
  expense: Expense,
  handlers: { onOpenDetail?: () => void; onScanFromImage?: () => void } = {}
) =>
  render(
    <ExpenseDetailAction
      expense={expense}
      onOpenDetail={handlers.onOpenDetail ?? jest.fn()}
      onScanFromImage={handlers.onScanFromImage ?? jest.fn()}
    />
  );

const getButton = () =>
  document.querySelector(
    '[data-component-id="expenses-detail-btn-expense-1"]'
  ) as HTMLButtonElement;

describe('ExpenseDetailAction', () => {
  it('renders green and never disabled when the expense has details', () => {
    renderAction({ ...baseExpense, has_details: true });

    const button = getButton();
    expect(button.className).toContain('text-green-600');
    expect(button.hasAttribute('disabled')).toBe(false);
    // No hover option at all.
    expect(
      screen.queryByText('Cargar detalle desde imagen')
    ).not.toBeInTheDocument();
  });

  it('fires onOpenDetail on click', () => {
    const onOpenDetail = jest.fn();
    renderAction({ ...baseExpense, has_details: true }, { onOpenDetail });

    fireEvent.click(getButton());
    expect(onOpenDetail).toHaveBeenCalledTimes(1);
  });

  it('renders gray (with the scan option available on hover) without details', () => {
    renderAction({ ...baseExpense, has_details: false });

    const button = getButton();
    expect(button.className).toContain('text-muted-foreground');
    expect(button.className).not.toContain('text-green-600');
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(
      screen.queryByText('Cargar detalle desde imagen')
    ).not.toBeInTheDocument();
  });

  it('treats a missing has_details flag as "no details"', () => {
    renderAction(baseExpense);
    expect(getButton().className).toContain('text-muted-foreground');
  });

  it('shows the scan option on hover and fires onScanFromImage', () => {
    const onScanFromImage = jest.fn();
    renderAction({ ...baseExpense, has_details: false }, { onScanFromImage });

    fireEvent.mouseEnter(getButton());

    const option = screen
      .getByText('Cargar detalle desde imagen')
      .closest('button') as HTMLButtonElement;
    expect(option).not.toBeNull();

    fireEvent.click(option);
    expect(onScanFromImage).toHaveBeenCalledTimes(1);
    // The pop-up closes after choosing the option.
    expect(
      screen.queryByText('Cargar detalle desde imagen')
    ).not.toBeInTheDocument();
  });
});
