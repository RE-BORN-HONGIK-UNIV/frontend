import { useEffect, useState } from 'react';
import { Alert, Badge, Button, LoadingBar, Paper, Stack, Text } from '@/components/ui';
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
 *
 * 2026-11: 경량 웹처럼 2단계 통화를 끝내면 바로 이 화면이 나온다(FaceStage, badge "2단계를 마쳤어요").
 * 배치도 경량 웹처럼 왼쪽 항목 이름 · 오른쪽 내용 한 줄씩(내용을 누르면 바로 고칠 수 있음, index.css .rb-profile).
 * 3단계에서는 확인한 카드가 지금 대답 기준이면 다시 묻지 않는다(InterviewStage).
 */
export function HaruProfileView({
  onNext,
  badge = '1·2단계에서 나눈 이야기',
  onQuit,
}: {
  onNext: (aboutMe: string[]) => void;
  badge?: string;
  /** 있으면 왼쪽 아래 "오늘은 여기까지 할게요" */
  onQuit?: () => void;
}) {
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
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        // 서버가 AI 없이 대답을 그대로 줬을 때도(키·한도 문제 등, source 'fallback') 고쳐 달라고 알린다 —
        // 예전엔 요청이 실패했을 때만 알려서, 대답 문장이 통째로 들어간 카드를 정리된 것처럼 보여 줬다
        setFailed(r.source === 'fallback');
      })
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
    <Paper p={32} radius="lg" withBorder style={{ background: 'var(--rb-surface)', borderColor: 'var(--rb-line)', maxWidth: 720, margin: '0 auto' }}>
      <Stack gap={18}>
        <div>
          <Badge color="brand">{badge}</Badge>
        </div>
        <div>
          <h2 className="rb-profile__title">
            하루가 이렇게 <span>이해했어요</span>
          </h2>
          <Text fz={15} c="var(--rb-ink-soft)" mt={8}>
            실전 면접 질문은 이 내용으로 만들어요. 틀린 부분이 있으면 눌러서 고쳐 주세요.
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
            <dl className="rb-profile">
              {items.map((it, n) => (
                <div key={it.label} className="rb-profile__row">
                  <dt>
                    <label htmlFor={`haru-profile-${n}`}>{it.label}</label>
                  </dt>
                  <dd>
                    <textarea
                      id={`haru-profile-${n}`}
                      className="rb-profile__value"
                      rows={1}
                      value={it.value}
                      maxLength={80}
                      placeholder="넘어갔어요 · 눌러서 채우기"
                      onChange={(e) => setItems(items.map((x, m) => (m === n ? { ...x, value: e.target.value } : x)))}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </Stack>
        )}

        <div className="rb-profile__actions">
          {onQuit ? (
            <button type="button" onClick={onQuit} style={linkStyle}>
              오늘은 여기까지 할게요
            </button>
          ) : (
            <span />
          )}
          <Button radius="md" size="lg" disabled={!items} onClick={confirm}>
            맞아요, 다음으로
          </Button>
        </div>
        <Text fz={12} c="var(--rb-ink-faint)">
          이 내용은 이 기기에만 남고, 면접 질문을 만들 때만 AI로 보내요.{' '}
          <button type="button" onClick={forget} style={{ ...linkStyle, fontSize: 12 }}>
            이 내용 지우고 넘어가기
          </button>
        </Text>
      </Stack>
    </Paper>
  );
}
