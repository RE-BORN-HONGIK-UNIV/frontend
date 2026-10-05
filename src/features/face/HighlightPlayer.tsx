import { useEffect, useRef, useState } from 'react';
import { Box, Button, Group, Text } from '@/components/ui';
import type { HighlightRange } from '@/lib/api/types';
import { nextPlaybackStep } from './live/highlight';

/**
 * 하이라이트 재생.
 * - ranges가 없으면(업로드 모드: 서버가 구간만 이어붙여 만든 mp4) 평범한 영상 플레이어.
 * - ranges가 있으면(실시간 모드: 브라우저에 녹화해 둔 전체 영상) 그 구간들만 차례로
 *   이어서 재생한다 — 편집본을 만드는 게 아니라 구간 끝에서 다음 구간 시작으로 건너뜀.
 */
export function HighlightPlayer({ src, ranges }: { src: string; ranges?: HighlightRange[] }) {
  if (!ranges || ranges.length === 0) {
    return <video src={src} controls style={{ width: '100%', borderRadius: 10, marginTop: 12, background: '#000' }} />;
  }
  return <RangePlayer src={src} ranges={ranges} />;
}

function RangePlayer({ src, ranges }: { src: string; ranges: HighlightRange[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const seekToRange = (i: number) => {
    const video = videoRef.current;
    if (!video) return;
    indexRef.current = i;
    setIndex(i);
    video.currentTime = ranges[i].start;
  };

  // MediaRecorder가 만든 webm은 길이(duration) 헤더가 없어 Infinity로 읽히고 이동(seek)이
  // 부정확하다 — 끝으로 한 번 이동시켜 브라우저가 길이를 계산하게 한 뒤 처음으로 되돌린다.
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (Number.isFinite(video.duration)) {
      seekToRange(0);
      return;
    }
    const onTimeUpdate = () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      seekToRange(0);
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    video.currentTime = 1e101;
  };

  // 재생 중에는 매 프레임 현재 시각을 확인해 구간 끝에서 정확히 넘어간다
  // (timeupdate는 ~250ms 간격이라 구간 끝을 넘겨버림)
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      const video = videoRef.current;
      if (!video) return;
      const step = nextPlaybackStep(video.currentTime, ranges, indexRef.current);
      if (step.kind === 'jump') {
        indexRef.current = step.index;
        setIndex(step.index);
        video.currentTime = step.time;
      } else if (step.kind === 'done') {
        video.pause();
        setPlaying(false);
        seekToRange(0);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, ranges]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
      setPlaying(false);
      return;
    }
    // 구간 밖에 있으면(예: 정지 중 이동) 현재 구간 시작부터
    const cur = ranges[indexRef.current];
    if (video.currentTime < cur.start || video.currentTime >= cur.end) video.currentTime = cur.start;
    void video.play();
    setPlaying(true);
  };

  const selectRange = (i: number) => {
    seekToRange(i);
    const video = videoRef.current;
    if (video && !playing) {
      void video.play();
      setPlaying(true);
    }
  };

  return (
    <Box style={{ marginTop: 12 }}>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        style={{ width: '100%', borderRadius: 10, background: '#000' }}
      />
      <Group gap={8} mt={8} align="center">
        <Button variant="default" radius="md" size="xs" onClick={toggle}>
          {playing ? '일시정지' : '재생'}
        </Button>
        {ranges.length > 1 &&
          ranges.map((r, i) => (
            <Button
              key={`${r.start}-${i}`}
              variant={i === index ? 'filled' : 'default'}
              color="brand"
              radius="md"
              size="xs"
              onClick={() => selectRange(i)}
            >
              {i + 1}
            </Button>
          ))}
        <Text fz={12} c="var(--rb-ink-faint)">
          {index + 1} / {ranges.length}구간
        </Text>
      </Group>
      <Text fz={11} c="var(--rb-ink-faint)" mt={6}>
        이 영상은 지금 이 브라우저 안에만 있어요. 서버로 보내거나 저장하지 않고, 이 화면을 벗어나면 사라져요.
      </Text>
    </Box>
  );
}
