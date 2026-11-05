import { useEffect, useRef, useState } from 'react';
import { Text } from '@/components/ui';
import { useRecorder } from '@/features/interview/useRecorder';
import { useLiveTranscript } from '@/features/interview/useLiveTranscript';
import { getNextQuestion, getSpeechAudioUrl, transcribeAnswer, uploadAnswer } from '@/features/interview/api';
import { QUESTION_BANK, type DifficultyTier } from '@/features/interview/difficulty';
import { getInterviewer, MAIN_QUESTION_COUNT } from '@/features/interview/interviewers';
import { createInterviewRecorder } from '@/features/interview/recorder';
import type { InterviewResult, InterviewTranscriptTurn } from '@/features/interview/resultSummary';
import { api } from '@/lib/api/client';
import { useAnswerLevel } from '@/features/interview/useAnswerLevel';
import { useLiveFaceSession } from '@/features/face/live/useLiveFaceSession';
import { useAnswerRecorder } from '@/features/haru/useAnswerRecorder';
import { buildStage3Marks } from '@/features/report/stage3Marks';
import { failStage3Voice, saveStage3Face, saveStage3Voice, skipStage3Voice, startStage3Details } from '@/features/report/stageDetails';

// 꼬리질문 생성 실패 시 쓰는 기본 꼬리질문
const FALLBACK_FOLLOW_UP = '방금 말씀하신 내용을 조금 더 자세히 설명해주실 수 있을까요?';

/**
 * loading: 질문 준비 중 (첫 질문 전)
 * asking: 면접관이 질문을 읽는 중 (TTS) — 다 읽으면 바로 듣기 시작(경량 웹 Talk3처럼 "답변 시작" 버튼 없음)
 * waiting: 면접관 목소리를 못 내서(TTS 실패·자동재생 막힘) 질문을 글로 보여 주고 대답 시작을 기다림
 * answering: 녹화 + 실시간 음성 인식 중
 * reviewing: 답변 저장 + 다음 질문 준비 중 ("잘 들었어요")
 * finished: 면접 종료 인사
 *
 * 2026-11 경량 웹 3단계 화면으로 바꾸며 받아쓴 답변을 고치는 확인 단계(confirm)는 뺐다 — 경량 웹처럼
 * 화면에 글을 띄우지 않고(시선이 글로 내려가지 않게) 받아쓴 그대로 넘긴다. 받아쓰기가 비면 서버 STT로 대체.
 */
type Phase = 'loading' | 'asking' | 'waiting' | 'answering' | 'reviewing' | 'finished';

// main: 기본 질문 번호(0부터), sub: 그 질문 안에서 몇 번째인지 (0 = 기본 질문, 1~ = 꼬리질문)
type Turn = { main: number; sub: number };

/**
 * 3단계 면접 질문 화면.
 * 기본 질문 MAIN_QUESTION_COUNT개 + 면접관(tier)별 꼬리질문 개수만큼 진행.
 * 첫 질문(자기소개)부터 분석 점수에 포함됨.
 * 답변 텍스트는 브라우저 음성 인식 결과를 유저가 확인·수정한 값을 꼬리질문 생성에 사용.
 * 음성 인식 미지원 브라우저는 서버 STT(transcribeAnswer)로 대체.
 * 내 얼굴 화면·타이머는 시선 분석과 긴장 완화를 위해 일부러 표시하지 않음.
 * 대답하는 동안에는 1·2단계와 같은 분석을 뒤에서 돌린다(2026-11, 경량 웹 리포트의 1→2→3단계 비교용):
 *  - 얼굴: 2단계 실시간 분석(useLiveFaceSession)을 숨긴 카메라로 — 첫 질문을 듣는 5초 동안 면접관을 보는 자리로
 *    시선 기준을 잡고, 대답하는 동안만(앞뒤 1초 제외) 잰다. 2단계 이력에는 안 남기고 리포트용으로만(saveStage3Face).
 *  - 목소리: 대답하는 구간만 이어 녹음(useAnswerRecorder)해 면접이 끝나면 1단계 분석(/analyze, stage=3 — 1단계 점수는
 *    안 덮음)으로 보낸다. 결과와 질문별 말버릇·멈춤 표시는 뒤에서 저장돼 리포트가 열린 뒤에 채워진다(saveStage3Voice).
 * 화면은 경량 웹 Talk3: 어두운 면접실 가운데 면접관 사진(움직이지 않음) + 아래 흰 버튼 줄(소리 막대·상태·
 * 다시 들려주세요·답변 마치기), 질문은 글로 보여 주지 않는다(index.css .rb-s3).
 */
export function QuestionView({
  stream,
  tier,
  aboutMe = [],
  onAllDone,
  onQuit,
}: {
  stream: MediaStream | null;
  tier: DifficultyTier;
  /** 하루가 정리하고 사용자가 확인한 자기 이야기("항목: 내용") — 기본 질문의 소재로 참고 */
  aboutMe?: string[];
  /** 결과 화면으로 넘어갈 때, 이번 면접의 질문·답변과 서버 저장 id를 함께 넘긴다 */
  onAllDone: (result: InterviewResult) => void;
  /** 위쪽 "그만하기" */
  onQuit: () => void;
}) {
  const interviewer = getInterviewer(tier);
  const { start, stop } = useRecorder(stream);

  const [turn, setTurn] = useState<Turn>({ main: 0, sub: 0 });
  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // ── 대답하는 동안의 얼굴 분석(2단계와 같은 로직) ──
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const questionStartsRef = useRef<number[]>([]);
  const face = useLiveFaceSession({
    videoRef: faceVideoRef,
    onComplete: (r) => saveStage3Face(r),
    getQuestionStarts: () => questionStartsRef.current,
    calibrateOnDemand: true,
    measureOnlyWhenAnswering: true,
    persist: false,
    // 3단계는 질문이 많고 대답이 길어서 2단계(3분)보다 넉넉히 — 대답한 시간 기준
    maxCaptureSec: 10 * 60,
  });
  // 카메라가 켜지면 바로 시선 기준 5초(첫 질문을 들으며 면접관을 보는 동안), 끝나면 재기 시작
  useEffect(() => {
    if (face.phase === 'camera') face.startCalibration();
    else if (face.phase === 'ready') face.beginRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 단계가 바뀔 때만
  }, [face.phase]);

  // ── 대답하는 동안의 목소리 녹음(1단계와 같은 분석으로 보냄) ──
  const voiceRec = useAnswerRecorder(phase === 'answering');
  // 녹음 안 대답 하나하나가 몇 번째 질문의 대답인지(녹음기의 turnStarts와 같은 순서), 다시 들려주세요로 버린 대답인지
  const answerLogRef = useRef<{ question: number; discarded: boolean }[]>([]);
  useEffect(() => {
    face.setAnswering(phase === 'answering');
    if (phase === 'answering') answerLogRef.current.push({ question: transcriptRef.current.length - 1, discarded: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 대답 시작·끝에만
  }, [phase]);

  const live = useLiveTranscript({ active: phase === 'answering' });
    // 소리 막대: 대답하는 동안 실제 마이크 음량
  const micLevel = useAnswerLevel(stream, phase === 'answering');

  // 면접 기록(질문·답변 텍스트) 서버 저장. 저장이 실패해도 면접은 계속된다(recorder.ts 참고).
  const recorderRef = useRef<ReturnType<typeof createInterviewRecorder> | null>(null);
  if (!recorderRef.current) {
    recorderRef.current = createInterviewRecorder(tier, {
      start: (t) => api.startInterviewSession(t),
      addTurn: (sid, kind, q) => api.addInterviewTurn(sid, kind, q),
      saveAnswer: (sid, tid, a) => api.saveInterviewAnswer(sid, tid, a),
      complete: (sid) => api.completeInterviewSession(sid),
    });
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
  // 음성이 끝났을 때 질문 읽는 중일 때만 반응하도록 최신 phase를 ref로 확인
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
    // 얼굴 분석의 질문별 구간 — 아직 재기 전(시선 기준 잡는 중)이면 0초로
    questionStartsRef.current.push(face.recordingNowSec() ?? 0);
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
        previousAnswer || undefined,
        isFollowUp ? 'follow_up' : 'main',
        aboutMe,
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
    startStage3Details(); // 지난 면접의 3단계 분석값이 새 리포트에 섞이지 않게
    recorder.start();
    loadQuestion({ main: 0, sub: 0 }, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartAnswer = () => {
    live.reset();
    start();
    setPhase('answering');
  };

  // 새 음성이 오면 처음부터 재생. 자동재생이 막히면 질문을 글로 보여 주고 기다린다(흐름이 멈추지 않게)
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    a.currentTime = 0;
    a.play().catch(() => {
      if (phaseRef.current === 'asking') setPhase('waiting');
    });
  }, [audioUrl]);

  // 질문을 다 읽으면 바로 듣기 시작 — 면접관 목소리가 녹음에 섞이지 않게 다 읽은 뒤에 시작한다
  const handleAudioEnded = () => {
    if (phaseRef.current === 'asking') handleStartAnswer();
  };

  // 다시 들려주세요: 듣던 건 버리고 질문을 처음부터 다시 읽는다
  const handleReplay = async () => {
    if (phaseRef.current === 'answering') {
      await stop();
      const last = answerLogRef.current[answerLogRef.current.length - 1];
      if (last) last.discarded = true; // 다시 듣기 전에 하던 대답은 표시에서 뺀다
    }
    live.reset();
    const a = audioRef.current;
    if (!a || !audioUrl) {
      setPhase('waiting');
      return;
    }
    setPhase('asking');
    a.currentTime = 0;
    a.play().catch(() => setPhase('waiting'));
  };

  const handleDoneSpeaking = async () => {
    blobRef.current = await stop();
    // 받아쓴 그대로 넘긴다. 음성 인식이 안 되는 브라우저(빈 글)는 서버 STT로 대체(submitAnswer)
    submitAnswer(live.supported ? live.transcript : '');
  };

  // 이 질문은 대답하지 않고 넘어갈게요: 녹음은 버리고 빈 답변으로
  const handleSkip = async () => {
    await stop();
    blobRef.current = null;
    submitAnswer('');
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
      void finishAnalysis();
      return;
    }

    setTurn(next);
    await loadQuestion(next, answer);
  };

  /** 면접을 마치면: 얼굴 분석을 끝내 저장하고, 이어 녹음한 대답을 목소리 분석으로 보낸다(리포트는 기다리지 않음) */
  const finishAnalysis = async () => {
    void face.finish();
    const rec = await voiceRec.finish();
    if (!rec) return skipStage3Voice();
    const questions = transcriptRef.current.map((t) => t.question);
    const log = answerLogRef.current;
    api
      .analyze(rec.file, null, 3)
      .then((result) => {
        const turns = rec.turnStarts
          .map((start, i) => ({ question: log[i]?.question ?? -1, discarded: log[i]?.discarded ?? true, start, end: rec.turnStarts[i + 1] ?? rec.spokenSec }))
          .filter((t) => !t.discarded && t.question >= 0);
        const marks = buildStage3Marks(questions, turns, {
          words: result.words ?? [],
          fillers: result.filler_detail.events ?? [],
          prolongs: result.prolong_detail?.events ?? [],
          longPauses: result.pause_detail.long_pauses ?? [],
        });
        saveStage3Voice(result, marks);
      })
      .catch(() => failStage3Voice());
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

  // 질문 번호: 꼬리질문까지 모두 센 "질문 n / 전체" (경량 웹처럼)
  const perMain = 1 + interviewer.followUps;
  const total = MAIN_QUESTION_COUNT * perMain;
  const current = Math.min(total, turn.main * perMain + turn.sub + 1);

  const status: Record<Phase, string> = {
    loading: '질문을 준비하고 있어요',
    asking: '질문하는 중',
    waiting: '질문을 읽어 주세요',
    answering: '듣고 있어요',
    reviewing: '잘 들었어요',
    finished: '면접을 마쳤어요',
  };
  const listening = phase === 'answering';
  const camOn = !!stream?.getVideoTracks().some((t) => t.readyState === 'live');

  return (
    <div className="rb-s3">
      <div className="rb-s3__top">
        <span>
          <b>실전 면접</b> · 질문 {current} / {total}
        </span>
        <span>
          {camOn && <span style={{ marginRight: 20 }}>● 카메라 켜짐</span>}
          <button type="button" className="rb-s3__quit" onClick={onQuit}>
            그만하기
          </button>
        </span>
      </div>

      {/* 면접관 사진은 움직이지 않고, 말하는 중인지는 아래 소리 막대로만 보여 준다 */}
      <div className="rb-s3__win" role="img" aria-label={`${interviewer.name} 면접관${phase === 'asking' ? ', 말하는 중' : ''}`} />
      <audio ref={audioRef} src={audioUrl ?? undefined} onEnded={handleAudioEnded} hidden />
      {/* 얼굴 분석용 카메라 — 화면에는 내 얼굴을 띄우지 않는다(경량 웹처럼). display:none이면 프레임이 안 들어와서 1px로 숨김 */}
      <video ref={faceVideoRef} muted playsInline aria-hidden className="rb-s3__facecam" />

      {phase === 'finished' ? (
        <div className="rb-s3__end">
          <div className="rb-s3__endl">
            <span className="rb-s3__ok" aria-hidden>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </span>
            <div>
              <b>면접을 마쳤어요. 수고하셨어요</b>
              <span>질문 {total}개를 끝까지 마쳤어요.</span>
            </div>
          </div>
          <button type="button" className="rb-s3__btn" data-dark disabled={finishing} onClick={handleFinish}>
            {finishing ? '정리하고 있어요…' : '결과 보러 가기 →'}
          </button>
        </div>
      ) : (
        <>
          {/* 면접관 목소리를 못 냈을 때만 질문을 글로 보여 준다(평소엔 글 없이 듣고 대답) */}
          {phase === 'waiting' && (
            <Text fz={17} fw={600} ta="center" c="#fff" style={{ maxWidth: 720, lineHeight: 1.6, padding: '0 16px' }}>
              {question}
            </Text>
          )}
          <div className="rb-s3__bar" aria-live="polite">
             <span
              className="rb-s3__bars"
              data-still={!(phase === 'asking' || listening) || undefined}
              data-live={listening || undefined}
              aria-hidden
            >
              {/* 대답하는 동안: 가운데가 가장 크고 양옆으로 작아지게 실제 음량을 나눠 준다. 질문하는 동안은 CSS 애니메이션 */}
              {[0.45, 0.75, 1, 0.75, 0.45].map((w, i) => (
                <i key={i} style={listening ? { height: `${Math.max(18, Math.min(100, micLevel * w * 1.6))}%` } : undefined} />
              ))}
            </span>
            <span className="rb-s3__st">{status[phase]}</span>
            <button
              type="button"
              className="rb-s3__btn"
              data-ghost
              onClick={handleReplay}
              disabled={!(phase === 'asking' || phase === 'answering' || phase === 'waiting')}
            >
              다시 들려주세요
            </button>
            {phase === 'waiting' ? (
              <button type="button" className="rb-s3__btn" data-dark onClick={handleStartAnswer}>
                대답 시작하기
              </button>
            ) : (
              <button type="button" className="rb-s3__btn" data-dark onClick={handleDoneSpeaking} disabled={!listening}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12l5 5L20 7" />
                </svg>
                답변 마치기
              </button>
            )}
          </div>
          {listening && (
            <button type="button" className="rb-s3__skip" onClick={handleSkip}>
              이 질문은 대답하지 않고 넘어갈게요
            </button>
          )}
        </>
      )}
    </div>
  );
}
