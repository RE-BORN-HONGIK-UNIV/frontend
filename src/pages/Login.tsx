import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from '@/lib/useForm';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Group,
  IconGoogle,
  IconKakao,
  IconLock,
  IconMail,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { useGuestStart, useLogin } from '@/features/auth/mutations';
import { ApiError } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { auth } from '@/lib/auth';

// Signup.tsx와 동일한 이유로 스텁 — app.py에 OAuth 연동 생기면 교체
const handleSocialLoginStub = (provider: string) => () =>
  toast.info(`${provider} 로그인은 아직 준비 중이에요.`);

type LocationState = { registered?: boolean; from?: string; guestFailed?: boolean } | null;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const login = useLogin();
  const guest = useGuestStart();
  // 토큰이 만료돼 이 화면으로 온 경우(client.ts의 401 처리)
  const expired = new URLSearchParams(location.search).has('expired');
  const wasGuest = auth.isGuest;

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
        <Text fz={17} c="var(--rb-ink-soft)">
          아직 계정이 없나요?{' '}
          <Anchor component={Link} to="/signup" c="var(--rb-primary-strong)" fw={600}>
            회원가입
          </Anchor>
        </Text>
      }
    >
      <form onSubmit={submit} noValidate>
        <Stack gap={20}>
          {expired && (
            <Alert color="brand" variant="light" p="xs" fz={13}>
              로그인이 만료됐어요. 다시 로그인해 주세요.
            </Alert>
          )}
          {state?.guestFailed && (
            <Alert color="red" variant="light" p="xs" fz={13}>
              지금은 로그인 없이 시작할 수 없어요. 잠시 뒤에 다시 시도하거나 로그인해 주세요.
            </Alert>
          )}
          {wasGuest && (
            <Alert color="brand" variant="light" p="xs" fz={13}>
              지금은 게스트로 이용 중이에요. 로그인하면 게스트로 남긴 기록은 옮겨지지 않아요.
            </Alert>
          )}
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
            icon={<IconMail />}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="비밀번호"
            icon={<IconLock />}
            autoComplete="current-password"
            {...form.getInputProps('password')}
          />
          <Button type="submit" color="brand" radius="md" loading={login.isPending} fullWidth mt={16}>
            로그인
          </Button>
          {!wasGuest && (
            <Button
              type="button"
              variant="default"
              radius="md"
              fullWidth
              loading={guest.isPending}
              onClick={() =>
                guest.mutate(undefined, {
                  onSuccess: () => navigate(state?.from ?? '/dashboard', { replace: true }),
                  onError: () => toast.error('지금은 로그인 없이 시작할 수 없어요. 잠시 뒤에 다시 시도해 주세요.'),
                })
              }
            >
              로그인 없이 시작하기
            </Button>
          )}
        </Stack>
      </form>

      <Stack gap={12} mt={20}>
        <Group gap={8} align="center">
          <Box style={{ flex: 1, height: 1, background: 'var(--rb-line)' }} />
          <Text fz={12} c="var(--rb-ink-faint)">
            또는
          </Text>
          <Box style={{ flex: 1, height: 1, background: 'var(--rb-line)' }} />
        </Group>
        <Button variant="default" fullWidth onClick={handleSocialLoginStub('구글')}>
          <IconGoogle /> 구글로 계속하기
        </Button>
        <Button
          variant="filled"
          fullWidth
          style={{ background: '#FEE500', color: '#191600' }}
          onClick={handleSocialLoginStub('카카오')}
        >
          <IconKakao /> 카카오로 계속하기
        </Button>
      </Stack>
    </AuthShell>
  );
}
