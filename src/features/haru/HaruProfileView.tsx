import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Group, LoadingBar, Paper, Stack, Text, Textarea } from '@/components/ui';
import { api } from '@/lib/api/client';
import type { HaruProfileItem } from '@/lib/api/types';
import { aboutMeLines, clearHaruTalk, loadHaruTalk, profileIsCurrent, profileSourceItems, saveProfile } from './store';
import { linkStyle } from './styles';

/** 서버 요약을 못 받았을 때: 대답 앞부분을 그대로 (사용자가 여기서 고친다) */
function rawItems(items: { label: string; answer: string }[]): HaruProfileItem[] {
  return items.map((it) => ({ label: it.label, value: it.answer.trim().slice(0, 40) }));
}

/**
 * 2단계와 3단계를 잇는 "하루가 이렇게 이해했어요" 카드 — 경량 웹 Profile 화면에서 가져옴.
 * 1·2단계에서 하루와 나눈 대답을 항목별로 짧게 정리해 보여 주고(POST /haru/profile), 사용자가 고친 내용을
 * 3단계 면접 질문의 소재로 넘긴다(onNext → /interview/next-question의 about_me).
 * 한 번 확인한 카드는 이 기기에 남겨 두고, 그 뒤에 1·2단계를 다시 했을 때만 새로 정리한다.
 */
export function HaruProfileView({ onNext }: { onNext: (aboutMe: string[]) => void }) {
  const [items, setItems] = useState<HaruProfileItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const rec = loadHaruTalk();
    if (profileIsCurrent(rec) && rec.profile) {
      setItems(rec.profile.items);
      return;
    }
    const source = profileSourceItems(rec);
    let cancelled = false;
    api
      .haruProfile(source)
      .then((r) => !cancelled && setItems(r.items))
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setItems(rawItems(source));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const confirm = () => {
    if (!items) return;
    saveProfile(items);
    onNext(aboutMeLines(items));
  };

  const forget = () => {
    clearHaruTalk();
    onNext([]);
  };

  return (
    <Paper p={24} radius="lg" withBorder style={{ background: 'var(--rb-surface)', borderColor: 'var(--rb-line)', maxWidth: 720, margin: '0 auto' }}>
      <Stack gap={16}>
        <div>
          <Badge color="brand">1·2단계에서 나눈 이야기</Badge>
        </div>
        <div>
          <Text fz={22} fw={700}>
            하루가 이렇게 이해했어요
          </Text>
          <Text fz={14} c="var(--rb-ink-soft)" mt={6}>
            실전 면접 질문은 이 내용을 참고해서 만들어요. 틀린 부분이 있으면 눌러서 고쳐 주세요.
          </Text>
        </div>

        {!items ? (
          <LoadingBar label="하루가 정리하고 있어요" />
        ) : (
          <Stack gap={12}>
            {failed && (
              <Alert color="gray" variant="light" p="xs" fz={13}>
                지금은 하루가 정리하지 못해서 대답을 그대로 가져왔어요. 짧게 고쳐 주면 좋아요.
              </Alert>
            )}
            {items.map((it, n) => (
              <Textarea
                key={it.label}
                id={`haru-profile-${n}`}
                label={it.label}
                value={it.value}
                maxLength={80}
                minRows={1}
                // 긴 대답도 다 보이게 글 길이만큼 칸이 커짐(지원 안 하는 브라우저는 드래그로 키움)
                style={{ fieldSizing: 'content' }}
                placeholder="넘어갔어요 · 눌러서 채우기"
                onChange={(e) => setItems(items.map((x, m) => (m === n ? { ...x, value: e.target.value } : x)))}
              />
            ))}
          </Stack>
        )}

        <Group justify="space-between" mt={8}>
          <button type="button" onClick={forget} style={linkStyle}>
            이 내용 지우고 넘어가기
          </button>
          <Button radius="md" disabled={!items} onClick={confirm}>
            맞아요, 다음으로 →
          </Button>
        </Group>
        <Text fz={12} c="var(--rb-ink-faint)">
          이 내용은 이 기기에만 남고, 면접 질문을 만들 때만 AI로 보내요.
        </Text>
      </Stack>
    </Paper>
  );
}
