import { Box, Button } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';

/**
 * 자주 묻는 질문 (/faq) — 로그인 없이 볼 수 있다. 메뉴의 "자주 묻는 질문"이 여기로 온다.
 * 질문·답을 바꾸려면 아래 FAQ 목록만 고치면 된다.
 *
 * 답변은 실제 동작과 맞아야 한다 — 특히 저장·전송 안내(3번)는 IntroView·1단계 안내 문구와 같은 내용으로 맞춰 둠.
 * 의료 서비스로 오해되지 않게 "치료·진단" 같은 말은 쓰지 않고, 도움 기관 연락처는 팀이 정하기 전까지 넣지 않는다.
 */
const FAQ: { q: string; a: string }[] = [
  {
    q: '준비물이 필요한가요?',
    a: '이력서나 자료는 필요 없어요. 마이크와 카메라가 있는 컴퓨터, 그리고 크롬이나 엣지 브라우저면 충분해요. 조용한 곳이면 더 좋아요.',
  },
  {
    q: '세 단계를 한 번에 다 해야 하나요?',
    a: '아니요. 오늘은 1단계만 해도 괜찮아요. 단계마다 끝나면 여기서 멈출 수 있고, 다음에 이어서 하면 돼요. 결과 리포트는 세 단계를 다 마친 뒤에 한 번에 보여 드려요.',
  },
  {
    q: '제 얼굴이나 목소리가 저장되나요?',
    a: '영상과 음성 파일은 저장하지 않아요. 2단계 표정·시선은 내 브라우저 안에서 바로 살펴보고, 숫자 요약만 남겨요. 3단계 면접의 질문과 대답 글은 내 계정에 저장되고 질문을 만들기 위해 AI로 보내져요. 면접 결과 화면에서 언제든 지울 수 있어요.',
  },
  {
    q: '하루는 누구인가요?',
    a: '1·2단계에서 함께 이야기하는 AI 대화 친구예요. 정해진 질문을 하고, 대답에 짧게 반응해 줘요. 평가하거나 조언하지 않아요.',
  },
  {
    q: '점수나 등급으로 평가하나요?',
    a: '아니요. 점수나 등급 대신 "가끔 있어요", "지금처럼 하면 돼요" 같은 말과 실제로 센 횟수만 보여 드려요. 다음에 무엇을 연습하면 좋을지 고르는 데 쓰는 자료예요.',
  },
  {
    q: '말이 막히거나 대답하기 어려우면요?',
    a: '대답하지 않고 넘어가도 괜찮아요. 하루에게 질문을 다시 들려 달라고 할 수도 있고, 통화나 면접은 언제든 그만둘 수 있어요.',
  },
  {
    q: '상담이나 치료를 대신할 수 있나요?',
    a: 'Re-born은 말하기와 마주하기를 연습하는 서비스이고, 의료나 상담 서비스가 아니에요. 마음이 많이 힘들다면 혼자 견디지 말고 가까운 사람이나 전문 상담에 도움을 요청해 주세요.',
  },
  {
    q: '마이크나 카메라가 안 잡혀요.',
    a: '브라우저 주소창 왼쪽의 자물쇠 아이콘을 눌러 마이크·카메라를 "허용"으로 바꾼 뒤 새로고침해 주세요. 다른 프로그램(화상 회의 등)이 카메라를 쓰고 있으면 먼저 꺼 주세요.',
  },
];

export default function FaqPage() {
  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 72 }}>
      <PageHeader back="/" eyebrow="자주 묻는 질문" title="궁금한 점을 모았어요" subtitle="여기 없는 내용은 아래 문의하기로 물어봐 주세요." />

      <Box style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 0', display: 'grid', gap: 10 }}>
        {FAQ.map((f) => (
          <details
            key={f.q}
            style={{
              background: 'var(--rb-surface)',
              border: '1px solid var(--rb-line)',
              borderRadius: 14,
              padding: '16px 20px',
            }}
          >
            <summary style={{ cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--rb-ink)', lineHeight: 1.5 }}>{f.q}</summary>
            <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.8, color: 'var(--rb-ink-soft)' }}>{f.a}</p>
          </details>
        ))}

        <Box
          style={{
            marginTop: 20,
            background: 'var(--rb-primary-tint)',
            border: '1px solid var(--rb-line)',
            borderRadius: 14,
            padding: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 15, color: 'var(--rb-ink)' }}>더 궁금한 점이 있나요?</span>
          {/* 해시(#contact)로 메인 화면 맨 아래 연락처까지 내려가려면 라우터 Link가 아니라 일반 링크여야 함(SiteNavLinks와 같은 이유) */}
          <Button component="a" href="/#contact" variant="default" radius="xl">
            문의하기
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
