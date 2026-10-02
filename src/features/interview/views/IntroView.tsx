import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Stack, Text } from '@/components/ui';
import { getAnxietyScore, getTier, type DifficultyTier, type StageKey } from '../difficulty';
import { NeedStagesView } from './NeedStagesView';
// 면접관 정보는 ReadyView·InterviewerAvatar와 같이 쓰도록 interviewers.ts로 분리
import { INTERVIEWERS } from '../interviewers';

// warmup → standard → practice 순서. 추천 tier 기준으로 선택 가능/잠김 구분에 사용
const TIER_ORDER: DifficultyTier[] = ['warmup', 'standard', 'practice'];

/**
 * 추천 tier 기준 면접관 상태.
 * recommended: 점수로 정해진 추천 면접관
 * easier: 추천보다 쉬운 면접관 (컨디션에 따라 선택 가능)
 * locked: 추천보다 어려운 면접관 (선택 불가)
 */
function getStatus(target: DifficultyTier, recommended: DifficultyTier) {
  const diff = TIER_ORDER.indexOf(target) - TIER_ORDER.indexOf(recommended);
  if (diff === 0) return 'recommended';
  if (diff < 0) return 'easier';
  return 'locked';
}

/** 면접관 아바타 영역. 현재는 emoji placeholder. */
function AvatarSlot({ emoji, size, label }: { emoji: string; size: number; label: string }) {
  return (
    <Box
      role="img"
      aria-label={`${label} 면접관`}
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        background: 'var(--rb-surface)',
        border: '1.5px dashed var(--rb-line-strong)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text fz={size * 0.45}>{emoji}</Text>
    </Box>
  );
}

/**
 * 3단계 면접 시작 전 면접관 소개 화면.
 * getAnxietyScore()로 1·2단계 최신 점수를 합산한 통합 점수를 받아 추천 면접관을 정함.
 * 두 단계 중 기록이 없는 단계가 있으면(조회 실패 포함) 면접을 시작시키지 않고
 * NeedStagesView로 해당 단계를 먼저 하고 오게 안내함.
 * 유저는 추천 면접관 또는 더 쉬운 면접관만 선택 가능. 어려운 면접관은 잠김.
 * onStart로 최종 선택된 tier를 넘겨줌 (질문 난이도 결정에 사용).
 */
export function IntroView({ onStart }: { onStart: (tier: DifficultyTier) => void }) {
  // 점수 받아오기 전에는 null. 잘못된 면접관이 잠깐 보이는 것 방지
  const [recommendedTier, setRecommendedTier] = useState<DifficultyTier | null>(null);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier | null>(null);
  // 잠긴 면접관 안내 말풍선을 띄울 대상 (hover 또는 탭)
  const [hintTier, setHintTier] = useState<DifficultyTier | null>(null);

  // 1·2단계 기록이 없어서 난이도를 못 정하는 경우 (안내 화면용)
  const [needStages, setNeedStages] = useState<{ missing: StageKey[]; failed: boolean } | null>(null);

  const loadScore = useCallback(() => {
    setNeedStages(null);
    setRecommendedTier(null);
    getAnxietyScore().then((result) => {
      if (result.status === 'missing') {
        setNeedStages({ missing: result.missing, failed: result.failed });
        return;
      }
      const { tier } = getTier(result.score);
      setRecommendedTier(tier);
      setSelectedTier(tier); // 기본 선택값은 추천 면접관
    });
  }, []);

  useEffect(() => {
    loadScore();
  }, [loadScore]);

  // TODO: TTS 연동 후 인사 음성 재생
  const handlePlayVoice = () => {};

  if (needStages) {
    return <NeedStagesView missing={needStages.missing} failed={needStages.failed} onRetry={loadScore} />;
  }

  if (recommendedTier === null || selectedTier === null) {
    return (
      <Stack align="center" style={{ paddingTop: 80 }}>
        <Text fz={14} c="var(--rb-ink-soft)">
          면접관을 준비하고 있어요...
        </Text>
      </Stack>
    );
  }

  const current = INTERVIEWERS.find((i) => i.tier === selectedTier) ?? INTERVIEWERS[0];
  const isRecommended = selectedTier === recommendedTier;

  return (
    <Stack align="center" gap={28} style={{ paddingTop: 40, paddingInline: 16 }}>
      <Stack gap={6} ta="center">
        <Text fz={22} fw={700}>
          오늘 함께할 면접관이에요
        </Text>
        <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.6 }}>
          지금까지 연습한 결과에 맞춰 면접관이 정해졌어요.
          <br />
          지금까지 쌓아온 걸 보여줄 차례예요.
        </Text>
      </Stack>

      {/* 좁은 화면에서는 면접관 목록이 카드 아래로 내려감 */}
      <Box
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 12,
          width: '100%',
          maxWidth: 560,
        }}
      >
        <Stack
          gap={16}
          style={{
            flex: '1 1 320px',
            padding: 24,
            borderRadius: 20,
            background: 'var(--rb-surface)',
            border: '1px solid var(--rb-line)',
          }}
        >
          <Box style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {current.tags.map((tag) => (
              <Text
                key={tag}
                fz={12}
                fw={600}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'var(--rb-bg, #fff)',
                  border: '1px solid var(--rb-line)',
                }}
              >
                {tag}
              </Text>
            ))}
          </Box>

          <Box style={{ display: 'flex', justifyContent: 'center' }}>
            <AvatarSlot emoji={current.emoji} size={180} label={current.name} />
          </Box>

          <Stack gap={8}>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text fz={20} fw={700}>
                {current.name}
              </Text>
              {isRecommended && (
                <Text
                  fz={11}
                  fw={700}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--rb-brand, #12b886)',
                    color: '#fff',
                  }}
                >
                  추천
                </Text>
              )}
            </Box>
            {/* 음성 없이도 읽을 수 있도록 인사말을 텍스트로 함께 표시 */}
            <Text fz={14} style={{ lineHeight: 1.6 }}>
              {current.intro}
            </Text>
            {/* 추천보다 쉬운 면접관을 골랐을 때만 표시 */}
            {!isRecommended && (
              <Text fz={12} c="var(--rb-ink-soft)">
                오늘은 편하게 연습해요. 추천 면접관은 언제든 다시 고를 수 있어요.
              </Text>
            )}
          </Stack>

          <Button
            variant="default"
            radius="xl"
            size="xs"
            onClick={handlePlayVoice}
            style={{ alignSelf: 'flex-start' }}
          >
            🔈 인사 듣기
          </Button>
        </Stack>

        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 10,
            borderRadius: 20,
            border: '1px solid var(--rb-line)',
          }}
        >
          {INTERVIEWERS.map((it) => {
            const status = getStatus(it.tier, recommendedTier);
            const locked = status === 'locked';
            const selected = it.tier === selectedTier;

            // 선택 가능한 면접관은 선택, 잠긴 면접관은 말풍선 토글(모바일 탭 대응)
            const handleClick = () => {
              if (locked) setHintTier(hintTier === it.tier ? null : it.tier);
              else setSelectedTier(it.tier);
            };

            return (
              // title 속성은 표시가 늦고 모바일에서 안 떠서 말풍선을 직접 구현
              <div
                key={it.tier}
                onMouseEnter={() => locked && setHintTier(it.tier)}
                onMouseLeave={() => setHintTier(null)}
                style={{ position: 'relative' }}
              >
                <button
                  type="button"
                  onClick={handleClick}
                  aria-pressed={selected}
                  aria-label={locked ? '잠긴 면접관' : `${it.name} 면접관 선택`}
                  style={{
                    display: 'block',
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    borderRadius: 16,
                    outline: selected ? '2px solid var(--rb-brand, #12b886)' : 'none',
                    outlineOffset: 2,
                    opacity: locked ? 0.45 : 1,
                    filter: locked ? 'grayscale(1)' : 'none',
                    cursor: locked ? 'help' : 'pointer',
                  }}
                >
                  <AvatarSlot
                    emoji={locked ? '🔒' : it.emoji}
                    size={64}
                    label={locked ? '잠긴' : it.name}
                  />
                </button>

                {/* 목록에서도 추천 면접관이 누군지 보이도록 작은 표시 */}
                {status === 'recommended' && (
                  <Text
                    fz={10}
                    fw={700}
                    style={{
                      position: 'absolute',
                      bottom: -6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: 'var(--rb-brand, #12b886)',
                      color: '#fff',
                      pointerEvents: 'none',
                    }}
                  >
                    추천
                  </Text>
                )}

                {hintTier === it.tier && (
                  <Text
                    fz={12}
                    style={{
                      position: 'absolute',
                      right: 'calc(100% + 10px)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      whiteSpace: 'nowrap',
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: 'var(--rb-ink, #222)',
                      color: '#fff',
                      zIndex: 10,
                    }}
                  >
                    훈련을 이어가면 만날 수 있어요
                  </Text>
                )}
              </div>
            );
          })}
        </Box>
      </Box>

      <Text fz={12} c="var(--rb-ink-soft)" ta="center" style={{ maxWidth: 360, lineHeight: 1.6 }}>
        답변 하나하나가 다음 훈련의 기준이 돼요.
        <br />
        완벽하지 않아도 끝까지 말해보는 게 중요해요.
      </Text>

      {/* 안내(동의 절차 아님): 면접 중 질문·답변 텍스트가 저장되고 AI로 전송된다는 점을 알린다.
          면접 답변은 민감할 수 있는 개인정보라 투명하게 알리는 것만은 남겨둔다. */}
      <Text fz={11} c="var(--rb-ink-faint)" ta="center" style={{ maxWidth: 420, lineHeight: 1.7 }}>
        면접 중 질문과 내 답변 텍스트는 내 계정에 저장되고, 꼬리질문과 코치 노트를 만들기 위해 AI(Anthropic)에 전송돼요.
        영상과 음성은 저장하지 않아요. 저장한 기록은 결과 화면에서 언제든 삭제할 수 있어요.
      </Text>

      <Button color="brand" radius="md" size="md" onClick={() => onStart(selectedTier)}>
        면접 준비 시작하기
      </Button>
    </Stack>
  );
}