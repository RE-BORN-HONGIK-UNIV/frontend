import { Link, useNavigate } from 'react-router-dom';
import { useForm } from '@/lib/useForm';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Checkbox,
  Group,
  IconAt,
  IconCalendar,
  IconGoogle,
  IconKakao,
  IconLock,
  IconMail,
  IconUser,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { useSignup } from '@/features/auth/mutations';
import { ApiError } from '@/lib/api/client';
import { toast } from '@/lib/toast';

// 구글/카카오 소셜 로그인은 백엔드에 OAuth 연동이 아직 없어서(app.py 참고) 버튼만
// 먼저 만들어둠 — 실제 연동 생기면 이 onClick을 각 provider의 인증 플로우 시작
// 함수로 교체하면 됨.
const handleSocialLoginStub = (provider: string) => () =>
  toast.info(`${provider} 로그인은 아직 준비 중이에요.`);

const SPECIAL_CHAR_RE = /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]/\\;']/;

// "20050923" 같은 숫자만 입력받아 "2000-01-01" 형태로 자동으로 "-"를 끼워 넣음
// (YYYY 4자리 → "-" → MM 2자리 → "-" → DD 2자리, 최대 8자리까지만 받음)
function formatBirthdateInput(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('-');
}

// 라벨 옆에 "(선택)"을 붙이되 본문(굵은 라벨)과 다른 연한 색을 유지하기 위한 헬퍼
function OptionalLabel({ children }: { children: string }) {
  return (
    <>
      {children} <span style={{ color: 'var(--rb-ink-soft)', fontWeight: 400 }}>(선택)</span>
    </>
  );
}

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
      password: (v) => {
        const value = v as string;
        if (value.length < 8) return '비밀번호는 8자 이상이어야 해요.';
        if (!/[a-zA-Z]/.test(value)) return '영문자를 포함해 주세요.';
        if (!/\d/.test(value)) return '숫자를 포함해 주세요.';
        if (!SPECIAL_CHAR_RE.test(value)) return '특수문자를 포함해 주세요.';
        return null;
      },
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
        <Text fz={17} c="var(--rb-ink-soft)">
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
          <TextInput label="이름" icon={<IconUser />} autoComplete="name" {...form.getInputProps('name')} />
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
            description="8자 이상 · 영문·숫자·특수문자 포함"
            autoComplete="new-password"
            {...form.getInputProps('password')}
          />
          <Group gap={12} align="flex-start" style={{ width: '100%' }}>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <TextInput
                label={<OptionalLabel>닉네임</OptionalLabel>}
                icon={<IconAt />}
                {...form.getInputProps('nickname')}
              />
            </Box>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <TextInput
                label={<OptionalLabel>생년월일</OptionalLabel>}
                icon={<IconCalendar />}
                placeholder="2000-01-01"
                inputMode="numeric"
                maxLength={10}
                {...form.getInputProps('birthdate')}
                onChange={(e) => {
                  e.currentTarget.value = formatBirthdateInput(e.currentTarget.value);
                  form.getInputProps('birthdate').onChange(e);
                }}
              />
            </Box>
          </Group>
          <Checkbox
            label="이용약관 및 개인정보 처리방침에 동의합니다."
            {...form.getInputProps('terms', { type: 'checkbox' })}
          />
          <Button type="submit" color="brand" radius="md" loading={signup.isPending} fullWidth mt={16}>
            가입하기
          </Button>
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
