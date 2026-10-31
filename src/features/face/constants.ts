export type MetricKey = 'blink' | 'gaze' | 'expression';

export interface MetricTab {
  key: MetricKey;
  label: string;
  desc: string;
}

export const METRIC_TABS: MetricTab[] = [
  { key: 'blink', label: '눈 깜빡임', desc: '분당 깜빡임 횟수' },
  { key: 'gaze', label: '시선 고정', desc: '카메라(상대방)를 바라보는 지속성' },
  { key: 'expression', label: '표정', desc: '미소·긴장(찡그림) 순간' },
];

/** 실시간 촬영(하루와 영상 통화) 자동 종료 시점(초) — 이 뒤에도 대화는 이어갈 수 있다. 너무 짧으면 깜빡임/시선 통계가 안정적이지 않고, 너무 길면
 * (사회불안이 있는 사용자 대상 앱이라) 촬영 부담과 분석 시간이 늘어나서
 * 3분으로 절충. */
export const MAX_CAPTURE_SEC = 180;

export const FACE_GUIDE_ITEMS = [
  { title: '정면 카메라', desc: '카메라를 정면으로 바라보고 촬영하세요.' },
  { title: '밝은 조명', desc: '얼굴이 잘 보이는 밝은 곳에서 촬영하세요.' },
  { title: '처음 5초', desc: '통화 전 5초는 기준값 측정에 쓰이니 화면 가운데를 봐주세요.' },
  { title: '하루를 보며', desc: '말하는 동안에는 화면 속 하루를 봐주세요.' },
  { title: '3분까지', desc: `표정·시선은 통화 시작 후 ${MAX_CAPTURE_SEC / 60}분까지 살펴봐요.` },
  { title: '자연스럽게', desc: '평소처럼 자연스러운 표정으로 촬영하세요.' },
];
