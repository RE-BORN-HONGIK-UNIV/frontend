import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Stack,
  Text,
} from '@/components/ui';
import { StageHeader } from '@/components/StageHeader';
import { ApiError } from '@/lib/api/client';
import type { CalibrationResult } from '@/lib/api/types';
import { GUIDE_ITEMS } from '@/features/voice/constants';
import { useAnalyze } from '@/features/voice/queries';
import { CalibrationStep } from '@/features/voice/CalibrationStep';
import { GuideChecklist } from '@/features/voice/GuideChecklist';
import { HaruChat, type DoneBar } from '@/features/haru/HaruChat';
import { linkStyle } from '@/features/haru/styles';
import { STAGE1_QUESTIONS } from '@/features/haru/script';
import { saveStageAnswers } from '@/features/haru/store';
import { useAnswerRecorder } from '@/features/haru/useAnswerRecorder';
import { useHaruTalk } from '@/features/haru/useHaruTalk';
import { ShieldIcon } from '@/components/ShieldIcon';

const MAXW = 720;
/** 하루와 대화하는 동안은 경량 웹처럼 하루 칸 + 대화 칸 두 칸이라 더 넓게 */
const TALK_MAXW = 1180;

/* ── 하루와 목소리 대화 (경량 웹 1단계에서 가져옴) ─────────────────── */

/** 하루와 대화하면서, 사용자가 말하는 구간만 이어 녹음해 둔다. 대화가 끝나면 녹음 파일을 넘긴다. */
type TalkRecording = Awaited<ReturnType<ReturnType<typeof useAnswerRecorder>['finish']>>;

function HaruVoiceTalk({ onFinished, doneBar }: { onFinished: (rec: TalkRecording) => void; doneBar: DoneBar }) {
  const finishRef = useRef<ReturnType<typeof useAnswerRecorder>['finish'] | null>(null);
  const talk = useHaruTalk(STAGE1_QUESTIONS, (answers) => {
    saveStageAnswers(1, answers);
    void (finishRef.current?.() ?? Promise.resolve(null)).then(onFinished);
  });
  const recorder = useAnswerRecorder(talk.phase === 'listen');
  finishRef.current = recorder.finish;

  return (
    <Stack gap={12}>
      {recorder.error && (
        <Alert color="gray" variant="light" p="xs" fz={13}>
          마이크를 쓸 수 없어서 목소리 분석은 못 해요. 대화는 계속할 수 있어요.
        </Alert>
      )}
      <HaruChat talk={talk} doneBar={doneBar} />
    </Stack>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function VoiceStage() {
  // micReady: 문장을 읽어 마이크가 확인됨, calibration: 서버가 뒤에서 만든 개인 기준값(대화 중에 도착할 수 있다.
  // 실패하면 null — 분석은 그대로 되고 개인 기준 보정만 빠진다)
  const [micReady, setMicReady] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
  const [started, setStarted] = useState(false);
  // 녹음이 비었는지(마이크를 못 썼거나 대답을 다 넘김)
  const [noAudio, setNoAudio] = useState(false);
  const [talkKey, setTalkKey] = useState(0);
  const analyze = useAnalyze();
  const navigate = useNavigate();
  // 마지막 녹음 — 목소리 정리가 실패하면 다시 이야기하지 않고 같은 녹음을 다시 보낼 수 있게
  const lastRecRef = useRef<{ file: File; turnStarts: number[] } | null>(null);
  // 분석 결과 저장(대시보드 완료 메모 + 최종 리포트 세부값)은 useAnalyze 안에서 한다 — 1단계가 끝나면 기다리지 않고
  // 바로 2단계로 넘어갈 수 있어서, 화면이 바뀐 뒤 분석이 끝나도 저장돼야 하기 때문(queries.ts 참고).
  // 1단계 결과는 여기서 따로 보여 주지 않고 3단계 뒤 통합 리포트에서 한 번에 보여 준다(경량 웹 흐름).

  const reset = () => {
    setMicReady(false);
    setCalibration(null);
    setStarted(false);
    setNoAudio(false);
    setTalkKey((k) => k + 1);
    analyze.reset();
  };

  const handleTalkFinished = (rec: TalkRecording) => {
    if (!rec) return setNoAudio(true);
    lastRecRef.current = { file: rec.file, turnStarts: rec.turnStarts };
    analyze.mutate({ file: rec.file, calibration, turnStarts: rec.turnStarts });
  };

  const resend = () => {
    const rec = lastRecRef.current;
    if (rec) analyze.mutate({ file: rec.file, calibration, turnStarts: rec.turnStarts });
  };

  // 대화가 끝나면 화면을 넘기지 않고 대화 그대로, 하단 바만 "1단계를 마쳤어요 · 2단계 영상 통화로"로 —
  // 결과는 최종 리포트에서만 보여 주므로 목소리 정리를 기다릴 필요가 없다(뒤에서 계속 정리되고 저장됨)
  const doneBar: DoneBar = {
    title: '1단계를 마쳤어요',
    sub: noAudio
      ? '녹음된 대답이 없어서 목소리는 살펴보지 못했어요.'
      : analyze.isError
        ? analyze.error instanceof ApiError
          ? analyze.error.message
          : '목소리를 정리하지 못했어요. 다시 보내 볼까요?'
        : // 정리 중이어도 같은 문구 — '정리하고 있어요 · 기다리지 않아도 돼요'는 기다려야 하나 헷갈리게 해서 뺐다
          '결과는 3단계까지 마친 뒤 리포트에서 함께 봐요.',
    actions: (
      <>
        {analyze.isError && !noAudio && (
          <button type="button" onClick={resend} style={linkStyle}>
            다시 보내기
          </button>
        )}
        <button type="button" onClick={reset} style={linkStyle}>
          하루와 다시 이야기할게요
        </button>
        <Button radius="md" size="lg" onClick={() => navigate('/face')}>
          2단계 영상 통화로 →
        </Button>
      </>
    ),
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <StageHeader current={1} />

      <Box style={{ maxWidth: started ? TALK_MAXW : MAXW, margin: '0 auto', padding: '40px 16px 0' }}>
        {!started ? (
          <Stack gap={16}>
            {/* 위: 가장 중요한 체크리스트 3개 */}
                        <div>
              <Text fz={15} fw={700} c="var(--rb-ink)">
                시작 전에 확인해요
              </Text>
              <Text fz={13} c="var(--rb-ink-soft)" mt={4}>
                준비된 것을 눌러 체크해요. 다 못 해도 시작할 수 있어요.
              </Text>
            </div>
            <GuideChecklist items={GUIDE_ITEMS} />

            {/* 아래: 마이크 확인 하나만 크게 — 개인정보 자세한 내용은 접어 둔다 */}
            <Box
              style={{
                background: 'var(--rb-surface)',
                border: '1px solid var(--rb-line)',
                borderRadius: 12,
                padding: 'clamp(22px, 5vw, 40px)',
                boxShadow: '0 40px 40px rgba(0,0,0,0.05)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--rb-font-display)',
                  fontSize: 'clamp(24px, 4.5vw, 34px)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: 'var(--rb-ink)',
                }}
              >
                목소리가 잘 <span style={{ color: 'var(--rb-primary)' }}>들리는지</span> 볼게요
              </h2>
              <Text fz={15} c="var(--rb-ink-soft)" mt={10}>
                질문 {STAGE1_QUESTIONS.length}개 · 5분 정도 걸려요
              </Text>

              <Box mt={24}>
                <CalibrationStep onReady={() => setMicReady(true)} onComplete={setCalibration} />
              </Box>

              <details style={{ marginTop: 16, fontSize: 13, color: 'var(--rb-ink-soft)' }}>
                <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, listStyle: 'none' }}>
                  <ShieldIcon />
                  녹음은 분석이 끝나면 바로 지워요
                  <span style={{ color: 'var(--rb-primary-strong)', fontWeight: 600 }}>자세히</span>
                </summary>
                <Text fz={13} c="var(--rb-ink-soft)" mt={6} style={{ lineHeight: 1.6, paddingLeft: 22, wordBreak: 'keep-all' }}>
                  대답은 글로 바뀌어(크롬은 Google 음성 인식) AI로 보내요. 하루와 나눈 이야기는 3단계 면접 질문을 만들 때
                  쓰도록 이 기기에만 남고, 2단계를 마친 뒤 지울 수 있어요.
                </Text>
              </details>

              <Box mt={28} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <Button radius="md" size="lg" disabled={!micReady} onClick={() => setStarted(true)}>
                  대화 시작하기
                </Button>
                {!micReady && (
                  <Text fz={12} c="var(--rb-ink-faint)">
                    마이크를 확인하면 시작할 수 있어요
                  </Text>
                )}
              </Box>
            </Box>
          </Stack>
        ) : (
          <Stack gap={20}>
            <HaruVoiceTalk key={talkKey} onFinished={handleTalkFinished} doneBar={doneBar} />
          </Stack>
        )}
      </Box>
    </Box>
  );
}