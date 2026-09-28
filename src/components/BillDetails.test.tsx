import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillDetails } from './BillDetails';

// Holds the parsed values the way the real forms do, so blur round-trips.
function Harness() {
  const [subtotal, setSubtotal] = React.useState<number | undefined>(50);
  const [total, setTotal] = React.useState<number | undefined>(60);
  const [tip, setTip] = React.useState<number | undefined>(18);
  return (
    <BillDetails
      subtotal={subtotal}
      total={total}
      tip={tip}
      tipIsRate={true}
      tipIncludedInTotal={false}
      onSubtotalChange={setSubtotal}
      onTotalChange={setTotal}
      onTipChange={setTip}
      onTipIsRateChange={() => {}}
    />
  );
}

function getInput(name: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) throw new Error(`no input named ${name}`);
  return input;
}

describe.each([
  ['sub', '50'],
  ['total', '60'],
  ['tip', '18'],
])('BillDetails %s input', (name, initial) => {
  test('backspacing the existing number clears the input', () => {
    render(<Harness />);
    const input = getInput(name);
    expect(input).toHaveValue(initial);

    userEvent.type(input, '{backspace}'.repeat(initial.length));

    expect(input).toHaveValue('');
  });

  test('clearing and blurring leaves the input empty', () => {
    render(<Harness />);
    const input = getInput(name);

    userEvent.type(input, '{backspace}'.repeat(initial.length));
    userEvent.tab();

    expect(input).toHaveValue('');
  });

  test('typing a new number replaces the old one', () => {
    render(<Harness />);
    const input = getInput(name);

    userEvent.type(input, '{backspace}'.repeat(initial.length) + '22');
    userEvent.tab();

    expect(input).toHaveValue('22');
  });
});

test('shows an updated prop value while not editing', () => {
  const props = {
    subtotal: 50, total: 60, tipIsRate: true, tipIncludedInTotal: false,
    onSubtotalChange: () => {}, onTotalChange: () => {}, onTipChange: () => {}, onTipIsRateChange: () => {},
  };
  const { rerender } = render(<BillDetails {...props} tip={18} />);
  rerender(<BillDetails {...props} tip={20} />);
  expect(screen.getByDisplayValue('20')).toBe(getInput('tip'));
});
