import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Box } from '@/components/ui';
import { RebornWordmark } from './RebornWordmark';
import { localProgress } from '@/features/progress/localProgress';

export type StageNo = 1 | 2 | 3 | 4;

/** 화면 읽기 프로그램에만 읽히는 글 */
const SR_ONLY = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const;

const STEPS: { no: StageNo; label: string }[] = [
  { no: 1, label: '목소리 대화' },
  { no: 2, label: '영상 통화' },
  { no: 3, label: '실전 면접' },
  { no: 4, label: '결과' },
];

/** 이 기기에 남은 완료 기록(localProgress) — 마친 단계는 숫자 대신 체크로 보인다 */
function isDone(no: StageNo): boolean {
  if (no === 1) return localProgress.stage1().done;
  if (no === 2) return localProgress.stage2().done;
  if (no === 3) return localProgress.stage3().done;
  return false;
}

function StepDot({ no, state }: { no: StageNo; state: 'current' | 'done' | 'todo' }) {
  const current = state === 'current';
  return (
    <span
      aria-hidden
      style={{
        width: 26,
        height: 26,
        flex: '0 0 26px',
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        fontSize: 13,
        fontWeight: 700,
        background: current ? 'var(--rb-primary-strong)' : 'var(--rb-surface)',
        // 지금 단계 번호: 진한 초록 위 배경색 글자 — 다크 모드에선 밝은 초록 위 어두운 글자가 돼서 읽힌다
        color: current ? 'var(--rb-surface)' : state === 'done' ? 'var(--rb-primary-strong)' : 'var(--rb-ink-soft)',
        border: current ? 'none' : `1.5px solid ${state === 'done' ? 'var(--rb-primary-light)' : 'var(--rb-line-strong)'}`,
      }}
    >
      {state === 'done' ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        no
      )}
    </span>
  );
}

/**
 * 1·2·3단계와 결과 화면 상단바 — 경량 웹처럼 "지금 몇 단계인지"를 가운데에 보여 준다.
 * 왼쪽 로고(메인으로), 가운데 ①목소리 대화 — ②영상 통화 — ③실전 면접 — ④결과, 오른쪽 "그만하기"(대시보드로).
 * 대시보드·연습·커뮤니티처럼 단계 밖 화면은 그대로 PageHeader를 쓴다.
 * 단계 표시는 안내용이라 누를 수 없다(단계를 건너뛰면 다음 단계에 필요한 결과가 없음).
 */
export function StageHeader({ current }: { current: StageNo }) {
  return (
    // 좁은 화면 처리(여백, 지금 단계만 이름 보이기)는 index.css의 .rb-stagebar — CSS라 첫 화면부터 맞는 모양
    <Box component="header" className="rb-stagebar">
      <Link to="/" aria-label="메인 화면으로" className="rb-stagebar__logo">
        <RebornWordmark size={36} animate={false} />
      </Link>

      <nav aria-label="훈련 단계" className="rb-stagebar__nav">
        <ol className="rb-stagebar__steps">
          {STEPS.map((s, i) => {
            const state = s.no === current ? 'current' : isDone(s.no) ? 'done' : 'todo';
            return (
              <Fragment key={s.no}>
                {i > 0 && (
                  <li aria-hidden className="rb-stagebar__line" />
                )}
                <li
                  aria-current={state === 'current' ? 'step' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: state === 'current' ? '6px 14px 6px 6px' : '6px',
                    borderRadius: 999,
                    background: state === 'current' ? 'var(--rb-primary-tint)' : 'transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <StepDot no={s.no} state={state} />
                  <span
                    className="rb-stagebar__label"
                    style={{
                      fontSize: 14,
                      fontWeight: state === 'current' ? 700 : 500,
                      color: state === 'current' ? 'var(--rb-primary-strong)' : 'var(--rb-ink-soft)',
                    }}
                  >
                    {s.label}
                    {state === 'done' && <span style={SR_ONLY}> (마침)</span>}
                  </span>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      <Link to="/dashboard" className="rb-stagebar__exit">
        그만하기
      </Link>
    </Box>
  );
}
