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

export const FACE_GUIDE_ITEMS = [
  { title: '정면 카메라', desc: '카메라를 정면으로 바라보고 촬영하세요.' },
  { title: '밝은 조명', desc: '얼굴이 잘 보이는 밝은 곳에서 촬영하세요.' },
  { title: '처음 5초', desc: '처음 5초는 기준값 측정에 쓰이니 정면을 봐주세요.' },
  { title: '10초 이상', desc: '정확한 분석을 위해 10초 이상 촬영하세요.' },
  { title: '자연스럽게', desc: '평소처럼 자연스러운 표정으로 촬영하세요.' },
  { title: 'MP4 형식', desc: '영상은 MP4 형식으로 준비하세요.' },
];
