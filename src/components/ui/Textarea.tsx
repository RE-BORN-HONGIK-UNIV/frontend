import { forwardRef, useId } from 'react';
import { FieldWrap, inputBaseStyle } from './TextInput';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  minRows?: number;
  autosize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, description, error, style, id, minRows = 3, autosize: _autosize, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <FieldWrap label={label} description={description} error={error} htmlFor={inputId}>
        <textarea
          ref={ref}
          id={inputId}
          rows={minRows}
          style={{
            ...inputBaseStyle,
            resize: 'vertical',
            fontFamily: 'inherit',
            ...(error ? { borderColor: '#c0392b' } : {}),
            ...style,
          }}
          {...rest}
        />
      </FieldWrap>
    );
  },
);
Textarea.displayName = 'Textarea';
