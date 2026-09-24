import { Box, Group, Text } from '@/components/ui';

/**
 * smile_score/tension_score(둘 다 0~100, 백엔드가 이미 계산해서 줌)를 그대로
 * 숫자로 반복하는 대신, 간단한 SVG 얼굴로 "지금 표정이 대략 이런 느낌"을
 * 보여주는 정적 아바타. 프레임 단위 애니메이션이 아니라 영상 전체 요약값
 * 기준의 한 장짜리 스냅샷.
 *
 * - 입꼬리 곡선: smile_score가 높을수록 더 크게 올라감 (0=일자, 100=활짝)
 * - 눈썹: tension_score가 낮을수록(=긴장 많이 감지될수록) 안쪽이 아래로
 *   처지면서 찌푸린 모양 — AU4(눈썹내림근) 판정 방향과 맞춰서 눈썹만 움직이고
 *   눈 모양 자체는 안 건드림(깜빡임/시선은 다른 탭이 담당하는 지표라 섞지 않음)
 */
export function FaceAvatar({ smileScore, tensionScore }: { smileScore: number; tensionScore: number }) {
  const smile = Math.min(100, Math.max(0, smileScore));
  const tension = Math.min(100, Math.max(0, tensionScore));

  // smile 0~100 → 입꼬리가 위로 올라가는 정도(0~14px)
  const mouthLift = (smile / 100) * 14;
  // tension 낮을수록(=찌푸림 신호 강할수록) 눈썹 안쪽이 아래로 처짐(0~7px)
  const browFurrow = ((100 - tension) / 100) * 7;

  return (
    <Box>
      <Box style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="48" fill="var(--rb-surface)" stroke="var(--rb-line-strong)" strokeWidth="2" />

          {/* 눈썹 — 안쪽 끝이 browFurrow만큼 아래로 */}
          <path
            d={`M 32 38 L 50 ${38 + browFurrow}`}
            stroke="var(--rb-ink)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M 88 38 L 70 ${38 + browFurrow}`}
            stroke="var(--rb-ink)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* 눈 — 고정, 다른 탭(깜빡임/시선) 지표라 여기선 안 움직임 */}
          <circle cx="40" cy="52" r="4" fill="var(--rb-ink)" />
          <circle cx="80" cy="52" r="4" fill="var(--rb-ink)" />

          {/* 입 — smileScore만큼 위로 휘어짐 */}
          <path
            d={`M 42 80 Q 60 ${80 - mouthLift} 78 80`}
            stroke="var(--rb-ink)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </Box>

      <Group justify="center" gap={20} mt={8}>
        <Text fz={13} c="var(--rb-ink-soft)">
          미소 <Text component="span" fw={700} c="var(--rb-primary-strong)">{smile}점</Text>
        </Text>
        <Text fz={13} c="var(--rb-ink-soft)">
          긴장 <Text component="span" fw={700} c="var(--rb-primary-strong)">{tension}점</Text>
        </Text>
      </Group>
    </Box>
  );
}
