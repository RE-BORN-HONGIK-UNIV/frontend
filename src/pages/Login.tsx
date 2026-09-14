import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from '@/lib/useForm';
import { Alert, Anchor, Button, PasswordInput, Stack, Text, TextInput } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { useLogin } from '@/features/auth/mutations';
import { ApiError } from '@/lib/api/client';

type LocationState = { registered?: boolean; from?: string } | null;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const login = useLogin();

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v as string) ? null : '올바른 이메일을 입력해 주세요.'),
      password: (v) => ((v as string).length >= 1 ? null : '비밀번호를 입력해 주세요.'),
    },
  });

  const submit = form.onSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => navigate(state?.from ?? '/dashboard', { replace: true }),
    });
  });

  return (
    <AuthShell
      title="로그인"
      subtitle="다시 오신 걸 환영해요."
      footer={
        <Text fz={13} c="var(--rb-ink-soft)">
          아직 계정이 없나요?{' '}
          <Anchor component={Link} to="/signup" c="var(--rb-primary-strong)" fw={600}>
            회원가입
          </Anchor>
        </Text>
      }
    >
      <form onSubmit={submit} noValidate>
        <Stack gap={16}>
          {state?.registered && (
            <Alert color="brand" variant="light" p="xs" fz={13}>
              회원가입이 완료됐어요. 로그인해 주세요.
            </Alert>
          )}
          {login.isError && (
            <Alert color="red" variant="light" p="xs" fz={13}>
              {login.error instanceof ApiError ? login.error.message : '로그인에 실패했어요.'}
            </Alert>
          )}
          <TextInput
            label="이메일"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="비밀번호"
            autoComplete="current-password"
            {...form.getInputProps('password')}
          />
          <Button type="submit" color="brand" radius="md" loading={login.isPending} fullWidth mt={4}>
            로그인
          </Button>
        </Stack>
      </form>
    </AuthShell>
  );
}
