import { useMemo, useState } from 'react';
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Dropzone,
  Group,
  LoadingBar,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { ApiError } from '@/lib/api/client';
import type { GazeBlinkResult } from '@/lib/api/types';
import { COMPARISON_BUILDERS, extractMetrics } from '@/features/face/comparison';
import { FACE_GUIDE_ITEMS, METRIC_TABS, type MetricKey } from '@/features/face/constants';
import { useAnalyzeGazeBlink } from '@/features/face/queries';
import { ScoreTrack } from '@/features/face/ScoreTrack';
import type { Stage2Entry } from '@/features/progress/localProgress';

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

  const metrics = useMemo(() => extractMetrics(result), [result]);
  const comparisonText = COMPARISON_BUILDERS[tab](metrics, previous);
  const highlight = result[tab].highlight;
  const score = result[tab].score;
  const status = getStatus(tab, result);

  return (
    <Stack gap={20}>
      <Button variant="default" radius="md" onClick={onReset} fullWidth>
        ↺ 새 파일로 다시 분석
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
              이번 영상에서는 따로 짚어서 보여드릴 순간이 없었어요.
            </Text>
          </Box>
        )}

        <Text fz={14} mt={12} style={{ lineHeight: 1.7 }}>
          {comparisonText}
        </Text>
      </Panel>

      <SectionLabel>점수 위치</SectionLabel>
      <Panel>
        <Text fz={13} c="var(--rb-ink-soft)" mb={10}>
          {METRIC_TABS.find((m) => m.key === tab)?.label} 점수가 0~100점 중 어디쯤인지 보여드려요.
        </Text>
        <ScoreTrack key={tab} score={score} />
      </Panel>
    </Stack>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function FaceStage() {
  const [file, setFile] = useState<File | null>(null);
  const analyze = useAnalyzeGazeBlink();
  const result = analyze.data ?? null;
  const previous: Stage2Entry | null = result?.previous ?? null;

  const reset = () => {
    setFile(null);
    analyze.reset();
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        back="/dashboard"
        eyebrow="2단계 · 표정·시선 분석"
        title="페이스 터치"
        subtitle="영상을 올리면 시선 처리·눈 깜빡임·표정을 지난 세션과 비교해서 보여드려요."
      />

      <Box style={{ maxWidth: MAXW, margin: '0 auto', padding: '20px 16px 0' }}>
        {result ? (
          <ResultView result={result} previous={previous} onReset={reset} />
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

            <SectionLabel>영상 파일 업로드</SectionLabel>
            <Panel>
              <Dropzone
                onDrop={(files) => setFile(files[0] ?? null)}
                onReject={() => setFile(null)}
                accept={{ 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'], 'video/webm': ['.webm'] }}
                maxFiles={1}
                multiple={false}
                radius="md"
                style={{ border: '2px dashed var(--rb-line-strong)', background: 'var(--rb-bg)' }}
              >
                <Stack align="center" gap={6} py={24} style={{ pointerEvents: 'none' }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--rb-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 15V3M7 8l5-5 5 5" />
                    <path d="M20 17v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
                  </svg>
                  <Text fz={14} fw={500}>
                    얼굴이 나오는 영상을 업로드하세요
                  </Text>
                  <Text fz={12} c="var(--rb-ink-faint)">
                    MP4 형식 · 드래그하거나 클릭
                  </Text>
                </Stack>
              </Dropzone>

              {file && !analyze.isPending && (
                <Group mt={10} gap={10} style={{ background: 'var(--rb-bg)', border: '1px solid var(--rb-line-strong)', borderRadius: 10, padding: '10px 14px' }}>
                  <Text fz={13} style={{ flex: 1, wordBreak: 'break-all' }}>
                    {file.name}
                  </Text>
                  <Anchor fz={13} c="var(--rb-ink-faint)" onClick={reset}>
                    ✕
                  </Anchor>
                </Group>
              )}

              {analyze.isPending && (
                <Stack align="center" gap={6} mt={14}>
                  <LoadingBar label="분석 중" />
                  <Text fz={12} c="var(--rb-ink-faint)">
                    영상 길이에 따라 다소 시간이 걸려요
                  </Text>
                </Stack>
              )}

              {analyze.isError && (
                <Alert color="red" variant="light" mt={10} p="xs" fz={13}>
                  {analyze.error instanceof ApiError
                    ? analyze.error.message
                    : '백엔드에 연결할 수 없어요. (localhost:5000 실행 확인)'}
                </Alert>
              )}

              <Button
                mt={12}
                fullWidth
                color="brand"
                radius="md"
                disabled={!file}
                loading={analyze.isPending}
                onClick={() => file && analyze.mutate(file)}
              >
                AI 분석 시작
              </Button>
            </Panel>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
