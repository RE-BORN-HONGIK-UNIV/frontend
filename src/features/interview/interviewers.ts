import type { DifficultyTier } from './difficulty';

/**
 * 난이도(tier)별 면접관 정보. IntroView·ReadyView·InterviewerAvatar에서 같이 사용.
 * TODO: 아바타 제작 전까지 emoji로 임시 표시. 완성되면 이미지로 교체.
 */
export type Interviewer = {
  tier: DifficultyTier;
  name: string;
  emoji: string;
  tags: string[];
  intro: string; // 면접관 소개 화면 인사말
  readyGreeting: string; // 면접 시작 직전 인사말 (TTS로 읽어줌)
  firstQuestion: string; // 첫 질문(자기소개). 면접관 말투에 맞춰 고정, API 호출 없이 바로 시작
  closing: string; // 면접 종료 인사말
  followUps: number; // 기본 질문 1개당 꼬리질문 개수
};

// 기본 질문 개수. 모든 난이도 공통
export const MAIN_QUESTION_COUNT = 3;

export const INTERVIEWERS: Interviewer[] = [
  {
    tier: 'warmup',
    name: '하린',
    emoji: '😊',
    tags: ['차근차근', '기본 질문'],
    intro:
      '반가워요, 하린이에요. 여기까지 온 것만으로도 충분히 잘하고 있어요. 오늘은 기본적인 질문부터 하나씩 같이 해봐요.',
    readyGreeting:
      '준비 잘 됐네요! 그럼 시작해볼게요. 천천히, 떠오르는 대로 말해도 괜찮아요.',
    firstQuestion: '먼저 간단하게 자기소개 부탁드려요. 편하게 말해주시면 돼요.',
    closing: '오늘 면접은 여기까지예요. 끝까지 답해줘서 정말 고마워요. 수고 많았어요!',
    followUps: 0,
  },
  {
    tier: 'standard',
    name: '도윤',
    emoji: '🙂',
    tags: ['차분한 진행', '직무 질문'],
    intro:
      '도윤입니다. 앞 단계에서 연습한 말하기를 이제 실제 질문에 적용해볼 거예요. 생각이 정리되면 그때 답해도 괜찮아요.',
    readyGreeting:
      '환경 점검이 끝났네요. 그럼 면접 시작하겠습니다. 편하게 답해주세요.',
    firstQuestion: '간단하게 자기소개 부탁드립니다.',
    closing: '오늘 면접은 여기까지입니다. 끝까지 성실하게 답해주셔서 감사합니다. 수고하셨습니다.',
    followUps: 1,
  },
  {
    tier: 'practice',
    name: '서진',
    emoji: '🧐',
    tags: ['꼬리질문', '실전 감각'],
    intro:
      '서진입니다. 여기까지 꾸준히 훈련해 오셨네요. 오늘은 답변을 한 번 더 파고드는 질문도 드릴게요. 실제 면접이라고 생각하고 답해보세요.',
    readyGreeting:
      '준비되셨으면 시작하겠습니다. 답변을 바탕으로 조금 더 깊이 여쭤보는 질문도 있을 거예요.',
    firstQuestion: '본인 소개와 함께, 지원하신 직무와 어떤 점이 잘 맞는지 말씀해주세요.',
    closing: '면접은 여기까지입니다. 어려운 질문에도 끝까지 답해주셨네요. 수고하셨습니다.',
    followUps: 2,
  },
];

/** tier에 맞는 면접관. 못 찾으면 standard(도윤) */
export function getInterviewer(tier: DifficultyTier): Interviewer {
  return INTERVIEWERS.find((i) => i.tier === tier) ?? INTERVIEWERS[1];
}