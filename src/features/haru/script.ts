/**
 * 하루(1·2단계 대화 상대)의 질문과 공감 한마디 — 경량 웹(reborn-lite, 판넬 OVERVIEW용)의 script.ts에서 옮김.
 * 질문 순서는 여기서 정하고, 대답에 맞춘 반응 문장만 서버(POST /haru/reply)가 만든다.
 * label은 "하루가 이렇게 이해했어요" 카드(3단계 들어가기 전)의 항목 이름이다.
 */

export interface HaruQuestion {
  q: string;
  label: string;
}

/** 1단계: 인사·이름·근황·관심사 (워밍업 대화) */
export const STAGE1_QUESTIONS: HaruQuestion[] = [
  { q: '안녕하세요! 저는 하루예요. 오늘은 편하게 이야기 나눠요. 뭐라고 불러 드리면 될까요?', label: '부를 이름' },
  { q: '반가워요. 요즘은 어떻게 지내세요? 아무 이야기나 괜찮아요.', label: '요즘 지내는 이야기' },
  { q: '요즘 관심 있는 건 뭐예요? 좋아하는 것도 괜찮아요.', label: '관심 있는 것' },
  { q: '그걸 좋아하게 된 계기가 있어요?', label: '좋아하게 된 계기' },
];

/** 2단계: 하고 싶은 일·경험·장점·걱정 (영상 통화) */
export const STAGE2_QUESTIONS: HaruQuestion[] = [
  { q: '요즘 해 보고 싶은 일이 있어요? 작은 것도 괜찮아요.', label: '해 보고 싶은 일' },
  { q: '그동안 해 본 일 중에 기억나는 게 있어요? 학교, 아르바이트, 취미 다 좋아요.', label: '해 본 일' },
  { q: '스스로 생각하는 나의 장점은 뭐예요?', label: '나의 장점' },
  { q: '면접을 생각하면 어떤 점이 가장 걱정돼요?', label: '면접에서 걱정되는 점' },
];

/** 서버 반응을 못 받을 때 돌려 가며 쓰는 공감 한마디 (backend haru/talk.py NODS와 같은 문장) */
export const NODS = ['그렇군요, 이야기해 줘서 고마워요.', '좋아요, 잘 들었어요.', '아, 그랬군요.', '천천히 말해 줘서 고마워요.'];

/** 서버 반응을 못 받았을 때 다음 질문으로 넘어가는 말 */
export function fallbackLine(questions: HaruQuestion[], nextIndex: number): string {
  return `${NODS[nextIndex % NODS.length]} ${questions[nextIndex].q}`;
}
