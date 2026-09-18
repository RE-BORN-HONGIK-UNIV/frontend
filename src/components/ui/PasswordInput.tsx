import { forwardRef, useId, useState } from 'react';
import { FieldWrap, inputBaseStyle } from './TextInput';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, description, error, style, id, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <FieldWrap label={label} description={description} error={error} htmlFor={inputId}>
        <div style={{ position: 'relative' }}>
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            className="rb-input"
            style={{
              ...inputBaseStyle,
              paddingRight: 40,
              ...(error ? { borderColor: '#c0392b' } : {}),
              ...style,
            }}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              color: 'var(--rb-ink-faint)',
              cursor: 'pointer',
              fontSize: 13,
              padding: 4,
            }}
          >
            {visible ? '숨기기' : '보기'}
          </button>
        </div>
      </FieldWrap>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
