import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GuideChecklist } from './GuideChecklist';

const items = [
  { title: '조용한 곳에서', desc: 'a' },
  { title: '마이크와 10~20cm', desc: 'b' },
];

describe('GuideChecklist — 눌러서 확인 표시', () => {
  it('누르면 확인됨(연한 초록), 다시 누르면 해제되고 다른 항목은 그대로', () => {
    render(<GuideChecklist items={items} />);
    const quiet = screen.getByRole('button', { name: /조용한 곳에서/ });
    const mic = screen.getByRole('button', { name: /마이크와/ });
    expect(quiet).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(quiet);
    expect(quiet).toHaveAttribute('aria-pressed', 'true');
    expect(quiet.style.background).toContain('--rb-primary-tint');
    expect(mic).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(quiet);
    expect(quiet).toHaveAttribute('aria-pressed', 'false');
    expect(quiet.style.background).toContain('--rb-surface');
  });
});
