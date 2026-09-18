import { useState } from 'react';

type Validators<T> = Partial<Record<keyof T, (value: T[keyof T]) => string | null>>;

interface UseFormOptions<T> {
  initialValues: T;
  validate?: Validators<T>;
}

/** @mantine/form의 useForm 대체 — 이 프로젝트에서 실제로 쓰는 부분(initialValues,
 * validate, getInputProps, onSubmit, reset)만 같은 API로 재구현. */
export function useForm<T extends Record<string, unknown>>({ initialValues, validate }: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const runValidation = (): boolean => {
    if (!validate) return true;
    const nextErrors: Partial<Record<keyof T, string>> = {};
    for (const key in validate) {
      const validator = validate[key];
      if (!validator) continue;
      const message = validator(values[key]);
      if (message) nextErrors[key] = message;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  function getInputProps(name: keyof T, opts: { type: 'checkbox' }): {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  function getInputProps(name: keyof T): {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    error: string | undefined;
  };
  function getInputProps(name: keyof T, opts?: { type: 'checkbox' }) {
    if (opts?.type === 'checkbox') {
      return {
        checked: Boolean(values[name]),
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const checked = e.currentTarget.checked;
          setValues((v) => ({ ...v, [name]: checked }));
      },
      };
    }
    return {
      value: (values[name] ?? '') as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        { 
          const value = e.currentTarget.value;
          setValues((v) => ({ ...v, [name]: value }));
        },
      error: errors[name],
    };
  }

  function onSubmit(handler: (values: T) => void) {
    return (e: React.FormEvent) => {
      e.preventDefault();
      if (runValidation()) handler(values);
    };
  }

  function reset() {
    setValues(initialValues);
    setErrors({});
  }

  return { values, errors, getInputProps, onSubmit, reset };
}
