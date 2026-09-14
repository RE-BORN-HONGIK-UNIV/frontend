import { forwardRef, useId } from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, id, ...rest }, ref) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        style={{ width: 16, height: 16, accentColor: 'var(--rb-primary)' }}
        {...rest}
      />
      {label}
    </label>
  );
});
Checkbox.displayName = 'Checkbox';
