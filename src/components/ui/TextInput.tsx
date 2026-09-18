import { forwardRef, useId } from 'react';

export const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: 'var(--rb-ink)',
  background: 'var(--rb-surface)',
  borderRadius: 10,
  outline: 'none',
};

interface FieldWrapProps {
  label?: string;
  description?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}

export function FieldWrap({ label, description, error, htmlFor, children }: FieldWrapProps) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {label}
        </label>
      )}
      {description && (
        <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--rb-ink-soft)' }}>{description}</p>
      )}
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#c0392b' }}>{error}</p>}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, description, error, style, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <FieldWrap label={label} description={description} error={error} htmlFor={inputId}>
        <input
          ref={ref}
          id={inputId}
          className="rb-input"
          style={{ ...inputBaseStyle, ...(error ? { borderColor: '#c0392b' } : {}), ...style }}
          {...rest}
        />
      </FieldWrap>
    );
  },
);
TextInput.displayName = 'TextInput';
