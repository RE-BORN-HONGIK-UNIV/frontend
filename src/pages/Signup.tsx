import { Link, useNavigate } from 'react-router-dom';
import { useForm } from '@/lib/useForm';
import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { useSignup } from '@/features/auth/mutations';
import { ApiError } from '@/lib/api/client';

export default function Signup() {
  const navigate = useNavigate();
  const signup = useSignup();

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      nickname: '',
      birthdate: '',
      terms: false,
    },
    validate: {
      name: (v) => ((v as string).trim() ? null : '이름을 입력해 주세요.'),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v as string) ? null : '올바른 이메일을 입력해 주세요.'),
      password: (v) => ((v as string).length >= 6 ? null : '비밀번호는 6자 이상이어야 해요.'),
      birthdate: (v) =>
        !v || /^\d{4}-\d{2}-\d{2}$/.test(v as string) ? null : 'YYYY-MM-DD 형식으로 입력해 주세요.',
      terms: (v) => (v ? null : '이용약관에 동의해 주세요.'),
    },
  });

  const submit = form.onSubmit((values) => {
    signup.mutate(
      {
        email: values.email,
        password: values.password,
        name: values.name.trim(),
        nickname: values.nickname.trim() || undefined,
        birthdate: values.birthdate || undefined,
        terms_agreed: values.terms,
      },
      { onSuccess: () => navigate('/login', { state: { registered: true } }) },
    );
  });

  return (
    <AuthShell
      title="회원가입"
      subtitle="천천히 시작해 봐요. 정보는 최소한만 받아요."
      footer={
        <Text fz={13} c="var(--rb-ink-soft)">
          이미 계정이 있나요?{' '}
          <Anchor component={Link} to="/login" c="var(--rb-primary-strong)" fw={600}>
            로그인
          </Anchor>
        </Text>
      }
    >
      <form onSubmit={submit} noValidate>
        <Stack gap={20}>
          {signup.isError && (
            <Alert color="red" variant="light" p="xs" fz={13}>
              {signup.error instanceof ApiError ? signup.error.message : '회원가입에 실패했어요.'}
            </Alert>
          )}
          <TextInput label="이름" autoComplete="name" {...form.getInputProps('name')} />
          <TextInput
            label="이메일"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="비밀번호"
            description="6자 이상"
            autoComplete="new-password"
            {...form.getInputProps('password')}
          />
          <TextInput label="닉네임" description="선택" {...form.getInputProps('nickname')} />
          <TextInput
            label="생년월일"
            description="선택 · YYYY-MM-DD"
            placeholder="2000-01-01"
            {...form.getInputProps('birthdate')}
          />
          <Checkbox
            label="이용약관 및 개인정보 처리방침에 동의합니다."
            {...form.getInputProps('terms', { type: 'checkbox' })}
          />
          <Button type="submit" color="brand" radius="md" loading={signup.isPending} fullWidth mt={16}>
            가입하기
          </Button>
        </Stack>
      </form>
    </AuthShell>
  );
}
