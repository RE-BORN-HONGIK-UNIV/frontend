import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Grid, Group, Paper, Stack, Text } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { auth } from '@/lib/auth';
import { daysSince, localProgress } from '@/features/progress/localProgress';

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
  const s1 = localProgress.stage1();

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
      title: '음성 정밀 진단',
      subtitle: '보이스 터치',
      desc: s1.done
        ? `음성 분석 완료 · 종합 점수 ${s1.score}점`
        : '음성 파형을 분석해 발화 안정성·유창성·침묵 조절력 등을 진단합니다.',
      path: '/voice',
      status: s1.done ? 'done' : 'available',
    },
    {
      id: 2,
      title: '표정 분석',
      subtitle: '페이스 터치',
      desc: '시선 처리와 표정을 분석해 비언어적 소통 능력을 교정합니다.',
      path: '/face',
      status: 'available',
    },
    {
      id: 3,
      title: '실전 모의 면접',
      subtitle: 'Adaptive Interview',
      desc: '앞 단계 결과를 바탕으로 맞춤형 난이도의 모의 면접을 진행합니다.',
      path: '/interview',
      status: 'locked',
    },
  ];

  const completed = STAGES.filter((s) => s.status === 'done').length;
  const pct = Math.round((completed / STAGES.length) * 100);
  const firstVisit = completed === 0;
  const gap = daysSince(s1.at);

  const handleReset = () => {
    if (window.confirm('진행 상황을 초기화할까요?')) {
      localProgress.resetStage1();
      window.location.reload();
    }
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        eyebrow={<Badge variant="light" color="brand">AI 기반 디지털 재활 솔루션</Badge>}
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

                <Box mt={14} style={{ background: 'var(--rb-bg)', borderRadius: 10, padding: 10 }}>
                  <Text fz={13} fw={500} c="var(--rb-primary-strong)" ta="center">
                    {completed === 0
                      ? '천천히, 당신의 속도로 시작해보세요 🌱'
                      : completed === STAGES.length
                        ? '모든 단계를 완료했어요! 정말 잘하셨어요 🎉'
                        : '꾸준히 잘 나아가고 있어요 💪'}
                  </Text>
                </Box>
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
                    ? '💡 지난번 결과를 바탕으로, 낮게 나온 지표부터 이어서 연습해볼까요?'
                    : '💡 첫 훈련으로 음성 정밀 진단부터 시작해보세요. 짧게 말해도 충분해요.'}
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
                              준비 중
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
                  최근 활동
                </Text>
                <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.6 }}>
                  {s1.done
                    ? `${gap && gap > 0 ? `${gap}일 전 · ` : ''}1단계 종합 ${s1.score}점`
                    : '아직 완료한 훈련이 없어요. 첫 훈련을 시작하면 여기에 기록이 쌓여요.'}
                </Text>
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
