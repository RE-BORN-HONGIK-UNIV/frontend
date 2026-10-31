import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import type { GazeBlinkResult } from '@/lib/api/types';
import { COMPARISON_BUILDERS, extractMetrics } from '@/features/face/comparison';
import { FACE_GUIDE_ITEMS, METRIC_TABS, type MetricKey } from '@/features/face/constants';
import { ScoreTrack } from '@/features/face/ScoreTrack';
import { ExpressionPlayer } from '@/features/face/ExpressionPlayback';
import { GazeTimeline } from '@/features/face/GazeTimeline';
import { HaruCallView } from '@/features/face/live/HaruCallView';
import { localProgress, type Stage2Entry } from '@/features/progress/localProgress';
import { stage2OverallScore } from '@/features/progress/stageProgress';

const MAXW = 720;

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rb-primary-strong)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fz={13} fw={700} c="var(--rb-primary-strong)" style={{ letterSpacing: '0.08em' }}>
      {children}
    </Text>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <Paper p={24} radius="lg" withBorder style={{ background: 'var(--rb-surface)', borderColor: 'var(--rb-line)' }}>
      {children}
    </Paper>
  );
}

/* 상태 문구별 배지 색 — "정상/편안함"은 긍정, "빈번/과응시/긴장됨"은 주의,
 * 그 외("보통")는 중립. gaze 지표는 status가 없어서(점수만 있음) null 처리. */
const STATUS_COLOR: Record<string, 'brand' | 'amber' | 'gray'> = {
  정상: 'brand',
  편안함: 'brand',
  빈번: 'amber',
  과응시: 'amber',
  긴장됨: 'amber',
  보통: 'gray',
};

function getStatus(tab: MetricKey, result: GazeBlinkResult): string | null {
  if (tab === 'blink') return result.blink.status;
  if (tab === 'expression') return result.expression.status;
  return null;
}

/* ── result view ─────────────────────────────────────────── */

function ResultView({
  result,
  previous,
  onReset,
}: {
  result: GazeBlinkResult;
  previous: Stage2Entry | null;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<MetricKey>('blink');
  const navigate = useNavigate();

  const metrics = useMemo(() => extractMetrics(result), [result]);
  const comparisonText = COMPARISON_BUILDERS[tab](metrics, previous);
  const highlight = result[tab].highlight;
  const score = result[tab].score;
  const status = getStatus(tab, result);

  return (
    <Stack gap={20}>
      <Button variant="default" radius="md" onClick={onReset} fullWidth>
        ↺ 하루와 다시 통화하기
      </Button>

      {!previous && (
        <Alert color="brand" variant="light" p="sm" fz={13}>
          🌱 첫 번째 페이스 터치 기록이 쌓였어요. 다음번엔 오늘과 비교해서 어떻게 달라졌는지 보여드릴게요.
        </Alert>
      )}

      <SectionLabel>지표별로 살펴보기</SectionLabel>
      <Panel>
        <SegmentedControl
          fullWidth
          value={tab}
          onChange={(v) => setTab(v as MetricKey)}
          data={METRIC_TABS.map((m) => ({ label: m.label, value: m.key }))}
        />

        <Text fz={11} c="var(--rb-ink-faint)" mt={10}>
          {METRIC_TABS.find((m) => m.key === tab)?.desc}
        </Text>

        <Group gap={10} align="center" mt={10}>
          <Text fz={28} fw={700} c="var(--rb-primary-strong)">
            {score}점
          </Text>
          {status && <Badge color={STATUS_COLOR[status] ?? 'gray'}>{status}</Badge>}
        </Group>

        {highlight ? (
          <video key={tab} src={highlight} controls style={{ width: '100%', borderRadius: 10, marginTop: 12, background: '#000' }} />
        ) : (
          <Box
            style={{
              marginTop: 12,
              padding: '28px 16px',
              borderRadius: 10,
              background: 'var(--rb-bg)',
              border: '1px dashed var(--rb-line-strong)',
              textAlign: 'center',
            }}
          >
            <Text fz={13} c="var(--rb-ink-faint)">
              이번 통화에서는 따로 짚어서 보여드릴 순간이 없었어요.
            </Text>
          </Box>
        )}

        <Text fz={14} mt={12} style={{ lineHeight: 1.7 }}>
          {comparisonText}
        </Text>
      </Panel>

      {tab === 'expression' && (
        <>
          <SectionLabel>표정 재생</SectionLabel>
          <Panel>
            <Text fz={13} c="var(--rb-ink-soft)" mb={10}>
              미소·긴장이 영상 어느 구간에서 나타났는지, 원하는 지표만 골라 얼굴로 재생해볼 수 있어요.
            </Text>
            <SimpleGrid cols={2} spacing={12}>
              <ExpressionPlayer
                key={`${tab}-smile`}
                indicator="smile"
                score={result.expression.smile_score}
                segments={result.expression.segments}
              />
              <ExpressionPlayer
                key={`${tab}-tension`}
                indicator="tension"
                score={result.expression.tension_score}
                segments={result.expression.segments}
              />
            </SimpleGrid>
          </Panel>
        </>
      )}

      {tab === 'gaze' && (
        <>
          <SectionLabel>시선 흐름</SectionLabel>
          <Panel>
            <Text fz={13} c="var(--rb-ink-soft)" mb={10}>
              점수 대신, 영상 전체에서 언제·얼마나 시선을 피했는지 구간으로 보여드려요.
            </Text>
            <GazeTimeline key={tab} segments={result.gaze.segments} />
          </Panel>
        </>
      )}

      <Button fullWidth radius="md" onClick={() => navigate('/interview')}>
        하루가 정리한 이야기 보고 3단계로 가기 →
      </Button>

      {tab === 'blink' && (
        <>
          <SectionLabel>점수 위치</SectionLabel>
          <Panel>
            <Text fz={13} c="var(--rb-ink-soft)" mb={10}>
              {METRIC_TABS.find((m) => m.key === tab)?.label} 점수가 0~100점 중 어디쯤인지 보여드려요.
            </Text>
            <ScoreTrack key={tab} score={score} status={status ?? undefined} statusColor={status ? STATUS_COLOR[status] ?? 'gray' : undefined} />
          </Panel>
        </>
      )}
    </Stack>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function FaceStage() {
  // 2단계는 실시간 촬영만 지원한다 — 예전 "영상 업로드" 모드(POST /analyze/gaze-blink)는
  // 2026-10-31 팀 결정으로 폐기. 얼굴 영상을 서버로 보내지 않는 실시간 모드 하나로 통일.
  // 촬영은 하루와 영상 통화하는 동안 뒤에서 한다(HaruCallView — 경량 웹 2단계 화면을 가져옴).
  const [result, setResult] = useState<GazeBlinkResult | null>(null);
  const previous: Stage2Entry | null = result?.previous ?? null;

  // 분석 결과가 나오면 이 기기에도 "2단계 완료" 메모를 남긴다 —
  // 서버 조회가 안 될 때 대시보드가 이 메모로 대신 완료 여부를 보여줌 (1단계와 같은 방식).
  useEffect(() => {
    if (!result) return;
    localProgress.markStage2Done(
      stage2OverallScore({
        blink: result.blink.score,
        gaze: result.gaze.score,
        expression: result.expression.score,
      }),
    );
  }, [result]);

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        back="/dashboard"
        eyebrow="2단계 · 하루와 영상 통화"
        title="페이스 터치"
        subtitle="하루와 영상 통화하는 동안 시선 처리·눈 깜빡임·표정을 살펴보고, 지난 세션과 비교해서 보여드려요."
      />

      <Box style={{ maxWidth: MAXW, margin: '0 auto', padding: '20px 16px 0' }}>
        {result ? (
          <ResultView result={result} previous={previous} onReset={() => setResult(null)} />
        ) : (
          <Stack gap={20}>
            <SectionLabel>분석 전 체크리스트</SectionLabel>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing={10}>
              {FACE_GUIDE_ITEMS.map((g) => (
                <Stack key={g.title} gap={6} style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-line)', borderRadius: 12, padding: '14px 12px' }}>
                  <Check />
                  <Text fz={13} fw={600} c="var(--rb-primary-strong)">
                    {g.title}
                  </Text>
                  <Text fz={11} c="var(--rb-ink-soft)" style={{ lineHeight: 1.5 }}>
                    {g.desc}
                  </Text>
                </Stack>
              ))}
            </SimpleGrid>

            <SectionLabel>하루와 영상 통화</SectionLabel>
            <HaruCallView onComplete={setResult} />
          </Stack>
        )}
      </Box>
    </Box>
  );
}
