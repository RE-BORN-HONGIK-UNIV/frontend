import { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Text } from '@/components/ui';
import { useRecorder } from '@/features/interview/useRecorder';
import { useLiveTranscript } from '@/features/interview/useLiveTranscript';
import { getNextQuestion, getSpeechAudioUrl, transcribeAnswer, uploadAnswer } from '@/features/interview/api';
import { QUESTION_BANK, type DifficultyTier } from '@/features/interview/difficulty';
import { InterviewerAvatar } from '@/features/interview/InterviewerAvatar';
import { getInterviewer, MAIN_QUESTION_COUNT } from '@/features/interview/interviewers';
import { createDisabledRecorder, createInterviewRecorder, type InterviewRecorder } from '@/features/interview/recorder';
import type { InterviewResult, InterviewTranscriptTurn } from '@/features/interview/resultSummary';
import { api } from '@/lib/api/client';

// 꼬리질문 생성 실패 시 쓰는 기본 꼬리질문
const FALLBACK_FOLLOW_UP = '방금 말씀하신 내용을 조금 더 자세히 설명해주실 수 있을까요?';

/**
 * loading: 질문 준비 중 (첫 질문 전)
 * asking: 면접관이 질문을 읽는 중 (TTS)
 * waiting: 질문 끝, 유저가 답변 시작 버튼 누르기 전
 * answering: 녹화 + 실시간 음성 인식 중
 * confirm: 답변 끝, 인식된 텍스트 확인·수정 후 제출
 * reviewing: 답변 저장 + 다음 질문 준비 중 ("답변을 살펴보고 있어요")
 * finished: 면접 종료 인사
 */
type Phase = 'loading' | 'asking' | 'waiting' | 'answering' | 'confirm' | 'reviewing' | 'finished';

// main: 기본 질문 번호(0부터), sub: 그 질문 안에서 몇 번째인지 (0 = 기본 질문, 1~ = 꼬리질문)
type Turn = { main: number; sub: number };

/**
 * 3단계 면접 질문 화면.
 * 기본 질문 MAIN_QUESTION_COUNT개 + 면접관(tier)별 꼬리질문 개수만큼 진행.
 * 첫 질문(자기소개)부터 분석 점수에 포함됨.
 * 답변 텍스트는 브라우저 음성 인식 결과를 유저가 확인·수정한 값을 꼬리질문 생성에 사용.
 * 음성 인식 미지원 브라우저는 서버 STT(transcribeAnswer)로 대체.
 * 내 얼굴 화면·타이머는 시선 분석과 긴장 완화를 위해 일부러 표시하지 않음.
 */
export function QuestionView({
  stream,
  tier,
  consent,
  onAllDone,
}: {
  stream: MediaStream | null;
  tier: DifficultyTier;
  /** 면접 기록 저장·AI 사용 동의 여부. false면 서버 저장 안 함 + 답변 텍스트를 AI로 보내지 않음(꼬리질문은 기본 문구) */
  consent: boolean;
  /** 결과 화면으로 넘어갈 때, 이번 면접의 질문·답변과 서버 저장 id를 함께 넘긴다 */
  onAllDone: (result: InterviewResult) => void;
}) {
  const interviewer = getInterviewer(tier);
  const { start, stop } = useRecorder(stream);

  const [turn, setTurn] = useState<Turn>({ main: 0, sub: 0 });
  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState(''); // 확인 단계에서 유저가 수정하는 답변 텍스트

  const live = useLiveTranscript({ active: phase === 'answering' });
  const level = useAudioLevel(stream, phase === 'answering');

  // 면접 기록(질문·답변 텍스트) 서버 저장. 저장이 실패해도 면접은 계속된다(recorder.ts 참고).
  const recorderRef = useRef<InterviewRecorder | null>(null);
  if (!recorderRef.current) {
    // 동의하지 않았으면 서버로 아무것도 보내지 않는 기록기 (세션 자체가 만들어지지 않음)
    recorderRef.current = consent
      ? createInterviewRecorder(tier, {
          start: (t) => api.startInterviewSession(t),
          addTurn: (sid, kind, q) => api.addInterviewTurn(sid, kind, q),
          saveAnswer: (sid, tid, a) => api.saveInterviewAnswer(sid, tid, a),
          complete: (sid) => api.completeInterviewSession(sid),
        })
      : createDisabledRecorder();
  }
  const recorder = recorderRef.current;

  // 결과 화면용으로 이번 면접의 질문·답변을 메모리에도 모아둔다 — 서버 저장이 실패해도 결과는 보여야 하므로
  const transcriptRef = useRef<InterviewTranscriptTurn[]>([]);
  const startedAtRef = useRef(Date.now());
  const endedAtRef = useRef(0);
  const startedRef = useRef(false); // 개발 모드(StrictMode)에서 effect가 두 번 돌아 첫 질문이 중복되는 것 방지
  const [finishing, setFinishing] = useState(false);

  const askedRef = useRef<string[]>([]); // 지금까지 한 질문 (중복 질문 방지용으로 서버에 전달)
  const blobRef = useRef<Blob | null>(null); // 방금 녹화한 답변 영상
  // InterviewerAvatar의 onEnded는 audioUrl이 바뀔 때도 불려서, 질문 읽는 중일 때만 반응하도록 최신 phase를 ref로 확인
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  // 이전 음성 URL은 정리해서 메모리 누수 방지
  const setAudio = (url: string | null) => {
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  /** 질문을 화면에 띄우고 면접관 목소리로 읽어줌. 음성 실패 시 바로 답변 대기로 넘어감 */
  const ask = async (text: string, kind: 'main' | 'follow_up') => {
    recorder.ask(kind, text); // 질문이 화면에 뜨는 시점에 서버에 저장
    transcriptRef.current.push({ kind, question: text, answer: '' });
    askedRef.current = [...askedRef.current, text];
    setQuestion(text);
    const url = await getSpeechAudioUrl(text, tier);
    setAudio(url);
    setPhase(url ? 'asking' : 'waiting');
  };

  /** 해당 차례의 질문을 준비. 첫 질문은 고정, 나머지는 백엔드에서 생성 (실패 시 고정 질문으로 대체) */
  const loadQuestion = async (next: Turn, previousAnswer: string) => {
    if (next.main === 0 && next.sub === 0) {
      await ask(interviewer.firstQuestion, 'main');
      return;
    }

    const isFollowUp = next.sub > 0;
    try {
      const { question: q } = await getNextQuestion(
        tier,
        askedRef.current,
        // 동의하지 않으면 답변 텍스트를 AI로 보내지 않는다 (서버는 답변이 없으면 기본 꼬리질문을 줌)
        consent ? previousAnswer || undefined : undefined,
        isFollowUp ? 'follow_up' : 'main',
      );
      await ask(q, isFollowUp ? 'follow_up' : 'main');
    } catch {
      const bank = QUESTION_BANK[tier];
      await ask(isFollowUp ? FALLBACK_FOLLOW_UP : bank[next.main % bank.length], isFollowUp ? 'follow_up' : 'main');
    }
  };

  // 화면 처음 열릴 때 첫 질문 시작
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    recorder.start();
    loadQuestion({ main: 0, sub: 0 }, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAskingEnded = () => {
    if (phaseRef.current === 'asking') setPhase('waiting');
  };

  const handleStartAnswer = () => {
    live.reset();
    start();
    setPhase('answering');
  };

  // 답변을 처음부터 다시: 지금까지 녹화·인식한 건 버리고 새로 시작
  const handleRetry = async () => {
    await stop();
    live.reset();
    start();
    setPhase('answering');
  };

  const handleDoneSpeaking = async () => {
    blobRef.current = await stop();
    // 음성 인식이 안 되는 브라우저는 확인 단계 없이 바로 제출 (서버 STT로 대체)
    if (!live.supported) {
      submitAnswer('');
      return;
    }
    setDraft(live.transcript);
    setPhase('confirm');
  };

  /** 다음 차례 계산. 꼬리질문이 남았으면 꼬리질문, 아니면 다음 기본 질문, 다 끝났으면 null */
  const getNextTurn = (current: Turn): Turn | null => {
    if (current.sub < interviewer.followUps) return { main: current.main, sub: current.sub + 1 };
    if (current.main < MAIN_QUESTION_COUNT - 1) return { main: current.main + 1, sub: 0 };
    return null;
  };

  const submitAnswer = async (text: string) => {
    setPhase('reviewing');

    const blob = blobRef.current;
    let answer = text.trim();
    if (blob) {
      await uploadAnswer(blob); // TODO: 실제 업로드·음성/표정 분석 API 연동 (지금은 mock)
      if (!answer) answer = await transcribeAnswer(blob);
    }

    const current = transcriptRef.current[transcriptRef.current.length - 1];
    if (current) current.answer = answer;
    recorder.answer(answer); // 유저가 확인·수정한 답변 텍스트 저장 (영상은 저장 안 함)

    const next = getNextTurn(turn);
    if (!next) {
      recorder.complete(); // 끝까지 마친 면접만 완료로 기록
      endedAtRef.current = Date.now();
      setQuestion('');
      const url = await getSpeechAudioUrl(interviewer.closing, tier);
      setAudio(url);
      setPhase('finished');
      return;
    }

    setTurn(next);
    await loadQuestion(next, answer);
  };

  /** 결과 화면으로: 밀린 서버 저장이 끝나 면접 id가 확정될 때까지 잠깐 기다린다(최대 3초 — 느려도 결과 화면은 막지 않음) */
  const handleFinish = async () => {
    setFinishing(true);
    await Promise.race([recorder.idle(), new Promise((r) => setTimeout(r, 3000))]);
    onAllDone({
      turns: transcriptRef.current.map((t) => ({ ...t })),
      sessionId: recorder.sessionId(),
      startedAt: startedAtRef.current,
      endedAt: endedAtRef.current || Date.now(),
    });
  };

  // 질문 번호 표시. 꼬리질문이 있는 면접관이면 "Q 1-2 / 3", 없으면 "Q 1 / 3"
  const questionLabel =
    interviewer.followUps > 0
      ? `Q ${turn.main + 1}-${turn.sub + 1} / ${MAIN_QUESTION_COUNT}`
      : `Q ${turn.main + 1} / ${MAIN_QUESTION_COUNT}`;

  const showQuestion = phase !== 'loading' && phase !== 'reviewing' && phase !== 'finished';

  const showMyBubble = phase === 'answering' || phase === 'confirm';

  return (
    <Stack align="center" gap={0} style={{ paddingTop: 0, paddingInline: 16 }}>
      {/* 질문·답변 말풍선까지 스크롤 없이 한 화면에 들어오도록 아바타 크기 축소 */}
      <InterviewerAvatar tier={tier} width={150} audioUrl={audioUrl} onEnded={handleAskingEnded} />

      <Box style={{ width: '100%', maxWidth: 640, marginTop: 14 }}>
        {/* ── 면접관 말풍선: 꼬리가 위쪽(면접관)을 가리킴 ── */}
        <Box
          style={{
            position: 'relative',
            borderRadius: 20,
            background: 'var(--rb-surface)',
            border: '1px solid var(--rb-line)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <Box
            aria-hidden
            style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              width: 16,
              height: 16,
              transform: 'translateX(-50%) rotate(45deg)',
              background: 'var(--rb-surface)',
              borderLeft: '1px solid var(--rb-line)',
              borderTop: '1px solid var(--rb-line)',
            }}
          />

          <Stack align="center" gap={10} style={{ padding: '24px 28px', minHeight: 100, justifyContent: 'center' }}>
            {phase === 'loading' && (
              <Text fz={14} c="var(--rb-ink-soft)">
                질문을 준비하고 있어요…
              </Text>
            )}

            {phase === 'reviewing' && (
              <>
                <Badge>답변 확인 중</Badge>
                <Text fz={14} c="var(--rb-ink-soft)">
                  답변을 살펴보고 있어요. 잠시만 기다려주세요.
                </Text>
              </>
            )}

            {phase === 'finished' && (
              <Text fz={16} fw={600} ta="center" style={{ lineHeight: 1.7 }}>
                {interviewer.closing}
              </Text>
            )}

            {showQuestion && (
              <>
                <Badge>{questionLabel}</Badge>
                <Text fz={16} fw={600} ta="center" style={{ lineHeight: 1.7 }}>
                  {question}
                </Text>
              </>
            )}
          </Stack>
        </Box>

        {/* ── 내 말풍선: 면접관 말풍선과 같은 모양, 꼬리만 아래쪽(나)을 가리킴 ── */}
        {showMyBubble && (
          <Box style={{ marginTop: 20 }}>
            <Box
              style={{
                position: 'relative',
                padding: '16px 24px',
                borderRadius: 20,
                background: 'var(--rb-surface)',
                border: '1px solid var(--rb-line)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}
            >
              <Box
                aria-hidden
                style={{
                  position: 'absolute',
                  bottom: -8,
                  left: '50%',
                  width: 16,
                  height: 16,
                  transform: 'translateX(-50%) rotate(45deg)',
                  background: 'var(--rb-surface)',
                  borderRight: '1px solid var(--rb-line)',
                  borderBottom: '1px solid var(--rb-line)',
                }}
              />

              <Text fz={11} fw={700} c="var(--rb-ink-faint)" mb={6}>
                내 답변
              </Text>

              {/* 답변 중: 인식은 뒤에서 계속 하지만 텍스트는 보여주지 않음.
                  자기 말이 적히는 걸 보려고 시선이 내려가면 시선 분석이 틀어지기 때문.
                  대신 마이크가 잘 듣고 있다는 것만 음량 막대로 표시 */}
              {phase === 'answering' && (
                <Stack gap={10} align="center" style={{ padding: '6px 0' }}>
                  <Text fz={14} c="var(--rb-ink-soft)">
                    듣고 있어요. 면접관을 보면서 편하게 말해주세요.
                  </Text>
                  <Box
                    aria-hidden
                    style={{
                      width: '60%',
                      height: 6,
                      background: 'var(--rb-line)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      style={{
                        height: '100%',
                        width: `${level}%`,
                        background: 'var(--rb-primary-strong)',
                        borderRadius: 3,
                        transition: 'width 80ms ease-out',
                      }}
                    />
                  </Box>
                  <Text fz={11} c="var(--rb-ink-faint)">
                    {live.supported
                      ? '답변이 끝나면 들은 내용을 보여드릴게요'
                      : '답변이 끝나면 내용이 정리돼요'}
                  </Text>
                </Stack>
              )}

              {/* 답변 끝: 인식된 텍스트 확인·수정 */}
              {phase === 'confirm' && (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label="답변 내용 수정"
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--rb-line-strong)',
                      fontSize: 14,
                      lineHeight: 1.7,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Text fz={11} c="var(--rb-ink-soft)" mt={4}>
                    잘못 들린 부분이 있으면 고쳐주세요. 고친 내용을 바탕으로 다음 질문이 이어져요.
                  </Text>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* ── 하단: 상태 표시(왼쪽) + 행동 버튼(오른쪽) ── */}
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 18,
            minHeight: 36,
          }}
        >
          <Box>
            {phase === 'asking' && (
              <Text fz={12} c="var(--rb-ink-faint)">
                질문을 듣고 있어요…
              </Text>
            )}
            {phase === 'answering' && (
              <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Box
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#e03131',
                    animation: 'rb-rec-blink 1.2s ease-in-out infinite',
                  }}
                />
                <Text fz={12} c="var(--rb-ink-soft)">
                  답변 중
                </Text>
                <style>{`@keyframes rb-rec-blink { 50% { opacity: 0.3; } }`}</style>
              </Box>
            )}
          </Box>

          <Box style={{ display: 'flex', gap: 8 }}>
            {/* 질문을 다 들은 뒤에 시작 가능. 면접관 목소리가 녹음에 섞이지 않게 하기 위함 */}
            {(phase === 'asking' || phase === 'waiting') && (
              <Button
                color="brand"
                radius="xl"
                size="sm"
                onClick={handleStartAnswer}
                disabled={phase === 'asking'}
              >
                🎙️ 답변 시작
              </Button>
            )}

            {phase === 'answering' && (
              <>
                <Button variant="subtle" radius="xl" size="sm" onClick={handleRetry}>
                  ↺ 다시 하기
                </Button>
                <Button color="brand" radius="xl" size="sm" onClick={handleDoneSpeaking}>
                  ✓ 답변 끝
                </Button>
              </>
            )}

            {phase === 'confirm' && (
              <>
                <Button variant="subtle" radius="xl" size="sm" onClick={handleStartAnswer}>
                  ↺ 다시 답변하기
                </Button>
                <Button color="brand" radius="xl" size="sm" onClick={() => submitAnswer(draft)}>
                  제출하기
                </Button>
              </>
            )}

            {phase === 'finished' && (
              <Button color="brand" radius="xl" size="sm" disabled={finishing} onClick={handleFinish}>
                {finishing ? '정리하고 있어요…' : '결과 보기'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}

/** 카드 상단 작은 라벨 (질문 번호, 상태 표시용) */
function Badge({ children }: { children: string }) {
  return (
    <Text
      fz={12}
      fw={600}
      style={{
        padding: '3px 10px',
        borderRadius: 999,
        border: '1px solid var(--rb-line-strong)',
        background: 'var(--rb-bg, #fff)',
      }}
    >
      {children}
    </Text>
  );
}

/**
 * 마이크 음량(0~100). active일 때만 측정.
 * 답변 중 텍스트 대신 "마이크가 듣고 있다"는 것만 보여주기 위해 사용.
 * 오디오 장치(AudioContext)는 스트림당 한 번만 만들어 재사용함.
 * 답변마다 새로 만들고 닫으면 정리가 늦게 돼서, 답변을 반복할수록 막대 반응이 느려졌음
 */
function useAudioLevel(stream: MediaStream | null, active: boolean) {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  // 스트림이 생기면 오디오 장치를 한 번만 준비, 화면을 떠날 때 정리
  useEffect(() => {
    if (!stream) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    ctxRef.current = ctx;
    analyserRef.current = analyser;

    return () => {
      source.disconnect();
      ctx.close();
      ctxRef.current = null;
      analyserRef.current = null;
    };
  }, [stream]);

  // 답변 중일 때만 측정. 약 15fps로 갱신
  useEffect(() => {
    const analyser = analyserRef.current;
    if (!active || !analyser) {
      setLevel(0);
      return;
    }
    // 브라우저가 오디오 장치를 일시정지 상태로 만들어둔 경우 다시 켬
    ctxRef.current?.resume();

    const data = new Uint8Array(analyser.frequencyBinCount);
    let rafId = 0;
    let lastUpdate = 0;
    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (now - lastUpdate < 66) return;
      lastUpdate = now;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(Math.min(100, Math.round((avg / 128) * 100)));
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [active]);

  return level;
}