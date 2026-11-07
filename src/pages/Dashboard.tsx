import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Grid, Group, Paper, Stack, Text } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { auth } from '@/lib/auth';
import { localProgress } from '@/features/progress/localProgress';
import { buildHistory, formatHistoryDate, nextStep } from '@/features/progress/history';
import { useStageProgress } from '@/features/progress/useStageProgress';

type Status = 'done' | 'available' | 'locked';

const ENCOURAGEMENTS = [
  '작은 한 걸음도 충분히 의미 있어요.',
  '오늘 목소리를 낸 것만으로도 큰 용기예요.',
  '완벽하지 않아도 괜찮아요, 계속하는 것만으로 충분해요.',
  '어제보다 한 뼘 더 편안해진 나를 응원해요.',
  '조급해하지 않아도 돼요. 당신의 속도가 정답이에요.',
  '지금 다시 시작할 용기를 낸 당신에게 박수를 보내요.',
];

/** Same quote all day, changes daily. */
function todaysEncouragement(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return ENCOURAGEMENTS[dayOfYear % ENCOURAGEMENTS.length];
}

function StageIcon({ id }: { id: number }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'var(--rb-primary-strong)',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (id === 1) return <svg {...common}><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" /></svg>;
  if (id === 2)
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <Box style={{ position: 'relative', width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--rb-primary-tint)" strokeWidth="6" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="var(--rb-primary)"
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
      </svg>
      <Text
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        fz={12}
        fw={700}
        c="var(--rb-primary-strong)"
      >
        {pct}%
      </Text>
    </Box>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const name = auth.name || '회원';
  // 1·2·3단계 모두 서버에 저장된 기록 기준 (서버 조회가 안 될 때만 브라우저 메모로 대신 보여줌)
  const { stage1: s1, stage2: s2, stage3: s3, sessions } = useStageProgress();

  const [streak, setStreak] = useState(1);
  useEffect(() => setStreak(localProgress.bumpStreak()), []);

  const STAGES: {
    id: number;
    title: string;
    subtitle: string;
    desc: string;
    path: string;
    status: Status;
  }[] = [
    {
      id: 1,
      // 이름은 훈련 화면 위 단계 표시(StageHeader)와 같게. 점수는 보이지 않는다(결과 화면에 평가 표현을 넣지 않는 팀 원칙)
      title: '목소리 대화',
      subtitle: '하루와 이야기하기',
      desc: s1.done
        ? '목소리 대화를 마쳤어요. 언제든 다시 할 수 있어요.'
        : '하루와 목소리로 이야기하며 말의 멈춤·채움말·떨림을 살펴봐요.',
      path: '/voice',
      status: s1.done ? 'done' : 'available',
    },
    {
      id: 2,
      title: '영상 통화',
      subtitle: '하루와 영상 통화하기',
      desc: s2.done
        ? '영상 통화를 마쳤어요. 언제든 다시 할 수 있어요.'
        : !s1.done
          ? '1단계를 마치면 열려요.'
          : '하루와 영상 통화하며 시선과 표정을 살펴봐요.',
      path: '/face',
      // 2026-11: 훈련은 메인 "무료로 시작하기" → 1단계부터 순서대로 진행하고, 이 화면은 내 기록을 보는 곳으로 쓴다.
      // 앞 단계를 마쳐야 다음 단계 카드가 열린다(이미 마친 단계는 다시 할 수 있게 열어 둠)
      status: s2.done ? 'done' : s1.done ? 'available' : 'locked',
    },
    {
      id: 3,
      title: '실전 면접',
      subtitle: '하루와 나눈 이야기로 면접 연습',
      // 면접관 이름은 난이도를 드러내서 뺐다(난이도는 화면에 보이지 않게 — 2026-11 팀 결정)
      desc: s3.done
        ? '실전 면접을 마쳤어요. 언제든 다시 할 수 있어요.'
        : !(s1.done && s2.done)
          ? `${s1.done ? '2단계' : '1·2단계'}를 마치면 열려요.`
          : '하루와 나눈 이야기로 만든 질문으로 실전처럼 연습해요.',
      path: '/interview',
      // 1·2단계를 마쳐야 열린다(완료한 뒤에도 다시 면접할 수 있게 'done'이어도 클릭은 열려 있음)
      status: s3.done ? 'done' : s1.done && s2.done ? 'available' : 'locked',
    },
  ];

  const completed = STAGES.filter((s) => s.status === 'done').length;
  const pct = Math.round((completed / STAGES.length) * 100);
  const firstVisit = completed === 0;
  // 마이페이지: 다음에 할 단계로 바로 가는 버튼 + 지난 기록(점수 없이 언제 무엇을 했는지)
  const next = nextStep(s1.done, s2.done, s3.done);
  const history = buildHistory(s1.at, s2.at, sessions);

  const handleReset = () => {
    // 서버에 저장된 1·2단계 분석 기록은 지우지 못한다(완료 표시도 서버 기준이라 그대로 남음).
    // 이 기기(브라우저)에 저장된 기록만 지운다.
    if (window.confirm('이 기기에 저장된 진행 기록을 초기화할까요?\n(서버에 저장된 1·2단계 분석 기록은 그대로 남아요)')) {
      localProgress.resetStage1();
      localProgress.resetStage2();
      localProgress.resetStage3();
      window.location.reload();
    }
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        eyebrow={<Badge variant="light" color="brand">마이페이지</Badge>}
        title={`안녕하세요, ${name} 님 🌱`}
        subtitle="오늘도 당신의 속도로, 천천히 나아가요"
        rightExtra={
          <Box style={{ background: 'var(--rb-primary-tint)', borderRadius: 999, padding: '6px 14px' }}>
            <Text fz={12} fw={600} c="var(--rb-primary-strong)">
              🔥 {streak}일 연속 방문 중
            </Text>
          </Box>
        }
      />

      <Box style={{ padding: '20px 40px 0' }}>
        <Grid gutter={24}>
          {/* main */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap={16}>
              <Paper p={20} radius="lg" withBorder style={{ background: 'var(--rb-surface)', borderColor: 'var(--rb-line)' }}>
                {firstVisit ? (
                  <Stack gap={6}>
                    <Text fz={18} fw={700}>
                      첫 훈련을 시작해볼까요?
                    </Text>
                    <Text fz={13} c="var(--rb-ink-soft)">
                      아주 짧게 말해도 괜찮아요. 준비되면 시작해보세요.
                    </Text>
                  </Stack>
                ) : (
                  <Group justify="space-between" align="center">
                    <Stack gap={2}>
                      <Text fz={11} fw={700} c="var(--rb-primary-strong)" style={{ letterSpacing: '1px' }}>
                        진행 현황
                      </Text>
                      <Text fz={22} fw={700}>
                        {completed}{' '}
                        <Text component="span" fz={13} fw={400} c="var(--rb-ink-faint)">
                          / {STAGES.length} 단계 완료
                        </Text>
                      </Text>
                    </Stack>
                    <ProgressRing pct={pct} />
                  </Group>
                )}

                <Group gap={0} mt={16} align="center" wrap="nowrap">
                  {STAGES.map((s, i) => (
                    <Group key={s.id} gap={0} style={{ flex: i < STAGES.length - 1 ? 1 : '0 0 auto' }} wrap="nowrap">
                      <Stack gap={6} align="center" style={{ flex: '0 0 auto' }}>
                        <Box
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            ...(s.status === 'done'
                              ? { background: 'var(--rb-primary)', color: '#fff' }
                              : s.status === 'available'
                                ? {
                                    background: 'var(--rb-primary-tint)',
                                    color: 'var(--rb-primary-strong)',
                                    border: '2px solid var(--rb-primary)',
                                  }
                                : { background: 'var(--rb-line)', color: 'var(--rb-ink-faint)' }),
                          }}
                        >
                          {s.status === 'done' ? '✓' : s.id}
                        </Box>
                        <Text fz={10} c="var(--rb-ink-soft)" ta="center" style={{ width: 64, lineHeight: 1.3 }}>
                          {s.title}
                        </Text>
                      </Stack>
                      {i < STAGES.length - 1 && (
                        <Box style={{ flex: 1, height: 2, background: 'var(--rb-primary-tint)', marginBottom: 22 }} />
                      )}
                    </Group>
                  ))}
                </Group>

                <Text fz={13} fw={500} c="var(--rb-primary-strong)" ta="center" mt={14}>
                  {completed === 0
                    ? '천천히, 당신의 속도로 시작해보세요 🌱'
                    : completed === STAGES.length
                      ? '모든 단계를 완료했어요! 정말 잘하셨어요 🎉'
                      : '꾸준히 잘 나아가고 있어요 💪'}
                </Text>
                {/* 이어서 하기 — 아직 안 한 가장 앞 단계로(다 했으면 최종 리포트) */}
                <Button fullWidth radius="md" size="md" mt={10} onClick={() => navigate(next.to)}>
                  {next.label} →
                </Button>
              </Paper>

              <Text fz={17} fw={700} c="var(--rb-primary-strong)" mt={10}>
                훈련 단계
              </Text>

              <Box
                style={{
                  background: 'var(--rb-primary-tint)',
                  border: '1px solid var(--rb-line)',
                  borderRadius: 12,
                  padding: '12px 16px',
                }}
              >
                <Text fz={13} c="var(--rb-primary-strong)" style={{ lineHeight: 1.6 }}>
                  {s1.done
                    ? '💡 다음 단계를 이어서 해 볼까요? 마친 단계는 언제든 다시 할 수 있어요.'
                    : '💡 첫 훈련은 목소리 대화부터 시작해요. 짧게 말해도 충분해요.'}
                </Text>
              </Box>

              {STAGES.map((stage) => {
                const locked = stage.status === 'locked';
                return (
                  <Paper
                    key={stage.id}
                    p={20}
                    radius="lg"
                    withBorder
                    onClick={() => !locked && navigate(stage.path)}
                    style={{
                      background: locked ? 'var(--rb-surface-tint)' : 'var(--rb-surface)',
                      borderColor: 'var(--rb-line)',
                      cursor: locked ? 'default' : 'pointer',
                      opacity: locked ? 0.6 : 1,
                    }}
                  >
                    <Group gap={16} wrap="nowrap" align="center">
                      <Box
                        style={{
                          flexShrink: 0,
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          background: 'var(--rb-primary-tint)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <StageIcon id={stage.id} />
                      </Box>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap={8} mb={2}>
                          <Text fz={11} fw={700} c="var(--rb-primary-strong)" style={{ letterSpacing: '1px' }}>
                            STEP {stage.id}
                          </Text>
                          {locked && (
                            <Badge size="xs" variant="light" color="gray">
                              잠김
                            </Badge>
                          )}
                          {stage.status === 'done' && (
                            <Badge size="xs" variant="light" color="brand">
                              완료 ✓
                            </Badge>
                          )}
                        </Group>
                        <Text fz={17} fw={700}>
                          {stage.title}
                        </Text>
                        <Text fz={12} c="var(--rb-ink-faint)" mb={6}>
                          {stage.subtitle}
                        </Text>
                        <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.6 }}>
                          {stage.desc}
                        </Text>
                      </Box>
                      <Text fz={20} fw={700} c="var(--rb-primary)" style={{ flexShrink: 0 }}>
                        {locked ? '🔒' : '→'}
                      </Text>
                    </Group>
                  </Paper>
                );
              })}

              {/* 최종 통합 리포트 다시 보기 — 3단계를 마친 뒤 나온 리포트(1·2·3단계를 한 장에)를 다시 연다 */}
              <Paper
                p={20}
                radius="lg"
                withBorder
                onClick={() => navigate('/report')}
                style={{ background: 'var(--rb-primary-tint)', borderColor: 'var(--rb-line)', cursor: 'pointer' }}
              >
                <Group gap={16} wrap="nowrap" align="center">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fz={11} fw={700} c="var(--rb-primary-strong)" style={{ letterSpacing: '1px' }}>
                      REPORT
                    </Text>
                    <Text fz={17} fw={700}>
                      최종 리포트 다시 보기
                    </Text>
                    <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.6 }}>
                      {s3.done
                        ? '1·2·3단계에서 보인 것을 한 장에 모은 리포트를 다시 볼 수 있어요.'
                        : '3단계까지 마치면 1·2·3단계를 한 장에 모은 리포트가 만들어져요.'}
                    </Text>
                  </Box>
                  <Text fz={20} fw={700} c="var(--rb-primary)" style={{ flexShrink: 0 }}>
                    →
                  </Text>
                </Group>
              </Paper>

              <Button variant="subtle" color="gray" size="xs" onClick={handleReset}>
                ↺ 진행 상황 초기화
              </Button>
            </Stack>
          </Grid.Col>

          {/* sidebar */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap={16}>
              <Paper p={20} radius="lg" withBorder style={{ background: 'var(--rb-surface)', borderColor: 'var(--rb-line)' }}>
                <Text fz={11} fw={700} c="var(--rb-primary-strong)" style={{ letterSpacing: '1px' }} mb={8}>
                  지난 기록
                </Text>
                {history.length === 0 ? (
                  <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.6 }}>
                    아직 완료한 훈련이 없어요. 첫 훈련을 시작하면 여기에 기록이 쌓여요.
                  </Text>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {history.map((h) => (
                      <li key={h.key}>
                        <div
                          role={h.to ? 'link' : undefined}
                          tabIndex={h.to ? 0 : undefined}
                          onClick={() => h.to && navigate(h.to)}
                          onKeyDown={(e) => h.to && e.key === 'Enter' && navigate(h.to)}
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'baseline',
                            padding: '8px 6px',
                            borderRadius: 8,
                            cursor: h.to ? 'pointer' : 'default',
                          }}
                        >
                          <Text fz={12} c="var(--rb-ink-faint)" style={{ width: 52, flexShrink: 0 }}>
                            {formatHistoryDate(h.at)}
                          </Text>
                          <Box style={{ minWidth: 0 }}>
                            <Text fz={14} fw={600}>
                              {h.title}
                            </Text>
                            <Text fz={12} c={h.to ? 'var(--rb-primary-strong)' : 'var(--rb-ink-soft)'}>
                              {h.detail}
                            </Text>
                          </Box>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Paper>

              <Paper p={20} radius="lg" withBorder style={{ background: 'var(--rb-primary-tint)', borderColor: 'var(--rb-line)' }}>
                <Text fz={11} fw={700} c="var(--rb-primary-strong)" style={{ letterSpacing: '1px' }} mb={8}>
                  오늘의 응원
                </Text>
                <Text fz={14} c="var(--rb-ink)" fw={500} style={{ lineHeight: 1.6 }}>
                  🌱 {todaysEncouragement()}
                </Text>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Box>
    </Box>
  );
}
