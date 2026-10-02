import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Text } from '@/components/ui';
import type { StageKey } from '../difficulty';

const STAGE_INFO: Record<StageKey, { label: string; path: string; action: string }> = {
  stage1: { label: '1단계 음성 분석', path: '/voice', action: '1단계 하러 가기' },
  stage2: { label: '2단계 표정·시선 분석', path: '/face', action: '2단계 하러 가기' },
};

/**
 * 면접 난이도(추천 면접관)는 1·2단계 결과를 합쳐서 정하기 때문에, 기록이 없는 단계가 있으면
 * 면접을 시작할 수 없다. 빠진 단계로 바로 이동시키는 안내 화면.
 * - 한쪽만 없음: 그 단계로 돌아가서 먼저 진행
 * - 둘 다 없음: 1·2단계를 먼저 진행하고 오기
 * - failed: 기록이 없는 게 아니라 불러오기에 실패한 경우 — 다시 불러오기 버튼도 제공
 */
export function NeedStagesView({
  missing,
  failed,
  onRetry,
}: {
  missing: StageKey[];
  failed: boolean;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  const both = missing.length === 2;

  const title = both ? '먼저 1·2단계를 진행하고 와주세요' : `${STAGE_INFO[missing[0]].label}이 먼저 필요해요`;
  const body = both
    ? '모의 면접의 난이도는 1단계(음성)와 2단계(표정·시선) 결과로 정해져요. 두 단계를 먼저 진행한 뒤 다시 와주세요.'
    : '모의 면접의 난이도는 1단계(음성)와 2단계(표정·시선) 결과로 정해져요. 아직 기록이 없는 단계를 먼저 진행한 뒤 다시 와주세요.';

  return (
    <Stack align="center" gap={20} style={{ paddingTop: 60, paddingInline: 16 }}>
      <Stack gap={8} ta="center" style={{ maxWidth: 420 }}>
        <Text fz={20} fw={700}>
          {title}
        </Text>
        <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.7 }}>
          {body}
        </Text>
        {failed && (
          <Text fz={12} c="var(--rb-ink-faint)" style={{ lineHeight: 1.6 }}>
            기록을 불러오지 못했을 수도 있어요. 이미 진행했다면 다시 불러와 주세요.
          </Text>
        )}
      </Stack>

      <Box style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
        {missing.map((key) => (
          <Button key={key} fullWidth color="brand" radius="md" onClick={() => navigate(STAGE_INFO[key].path)}>
            {STAGE_INFO[key].action}
          </Button>
        ))}
        {failed && (
          <Button fullWidth variant="default" radius="md" onClick={onRetry}>
            다시 불러오기
          </Button>
        )}
      </Box>
    </Stack>
  );
}
