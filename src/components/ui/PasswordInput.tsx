import { forwardRef, useId, useState, type ReactNode } from 'react';
import { FieldWrap, inputBaseStyle } from './TextInput';
import { IconEye, IconEyeOff } from './icons';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
  icon?: ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, description, error, icon, style, id, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <FieldWrap label={label} description={description} error={error} htmlFor={inputId}>
        <div style={{ position: 'relative' }}>
          {icon && (
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--rb-ink-faint)',
                display: 'flex',
                pointerEvents: 'none',
              }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            className="rb-input"
            style={{
              ...inputBaseStyle,
              paddingRight: 40,
              ...(icon ? { paddingLeft: 38 } : {}),
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
              padding: 4,
              display: 'flex',
            }}
          >
            {visible ? <IconEyeOff /> : <IconEye />}
          </button>
        </div>
      </FieldWrap>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
