import { useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Stack, Text, TextInput } from '@/components/ui';
import { api, ApiError } from '@/lib/api/client';
import { auth } from '@/lib/auth';

/** backend NICKNAME_MAX_LEN과 같다 */
export const NICKNAME_MAX_LEN = 20;

/**
 * "무료로 시작하기"(로그인 없이 시작)로 들어온 게스트에게, 웹에서 불러 줄 이름을 먼저 묻는다.
 * 뒤 화면(대시보드 등)은 흐리게 보이게 두고 입력 창만 가운데에 띄운다 — 어디로 들어왔는지는 보이되,
 * 이름을 정하기 전에는 뒤 화면을 누를 수 없다(inert).
 * 이름은 계정(User.nickname)에 저장돼 새로고침·다른 단계·훈련이 끝날 때까지 그대로 불린다.
 * 회원(로그인)은 가입할 때 이름을 받았으니 묻지 않는다.
 */
export function NicknameGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => auth.needsNickname);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nickname = value.trim();
    if (!nickname) return setError('불러 드릴 이름을 입력해 주세요.');
    if (nickname.length > NICKNAME_MAX_LEN) return setError(`이름은 ${NICKNAME_MAX_LEN}자까지 쓸 수 있어요.`);
    setSaving(true);
    setError(null);
    try {
      const { name } = await api.setNickname(nickname);
      auth.setNickname(name);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '잠시 뒤에 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* key: 이름을 정하면 뒤 화면을 새로 그려 바뀐 이름("안녕하세요, 하늘 님")이 바로 보이게 한다 —
          화면들이 auth.name을 그릴 때 한 번 읽기 때문 */}
      <div key={open ? 'locked' : 'named'} inert={open} aria-hidden={open || undefined}>
        {children}
      </div>
      {/* body에 바로 그린다 — 페이지 등장 애니메이션(transform)이 걸린 요소 안에 두면 position: fixed가
          화면이 아니라 그 요소 기준이 돼서 창이 가운데에서 벗어난다 */}
      {open && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            background: 'color-mix(in srgb, var(--rb-bg) 45%, transparent)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="nickname-title"
            onSubmit={submit}
            noValidate
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'var(--rb-surface)',
              border: '1px solid var(--rb-line)',
              borderRadius: 20,
              padding: 28,
              boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
            }}
          >
            <Stack gap={16}>
              <div>
                <h2 id="nickname-title" style={{ margin: 0, fontSize: 21, fontWeight: 700, color: 'var(--rb-ink)' }}>
                  어떻게 불러 드릴까요?
                </h2>
                <Text fz={14} c="var(--rb-ink-soft)" mt={6}>
                  훈련하는 동안 이 이름으로 불러 드릴게요. 별명도 괜찮아요.
                </Text>
              </div>
              <TextInput
                aria-label="불러 드릴 이름"
                placeholder="예: 하늘"
                value={value}
                maxLength={NICKNAME_MAX_LEN}
                autoFocus
                onChange={(e) => {
                  setValue(e.currentTarget.value);
                  setError(null);
                }}
                error={error ?? undefined}
              />
              <Button type="submit" color="brand" radius="md" fullWidth loading={saving}>
                시작하기
              </Button>
            </Stack>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}
