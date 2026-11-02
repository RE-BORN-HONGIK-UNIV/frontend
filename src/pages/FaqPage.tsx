import { Link } from 'react-router-dom';
import { Box, Button } from '@/components/ui';
import { RebornWordmark } from '@/components/RebornWordmark';
import { SiteNavLinks } from '@/components/SiteNavLinks';

/**
 * 자주 묻는 질문 (/faq) — 로그인 없이 볼 수 있다. 메뉴의 "자주 묻는 질문"이 여기로 온다.
 * 큰 "FAQ" 제목 아래 질문·답을 채팅 말풍선처럼 보여 준다: Q는 왼쪽 흰 말풍선, A는 오른쪽 초록 말풍선.
 *
 * 질문·답 바꾸는 법: 아래 FAQ 목록만 고치면 된다.
 *  - q: 질문 말풍선들 (두 질문을 한 답으로 묶고 싶으면 질문을 두 개 넣는다)
 *  - a: 답 말풍선들 (길면 두세 개로 나누면 읽기 쉽다)
 * 지금 글은 예시다. 답은 실제 동작과 맞아야 한다 — 특히 저장·전송 안내는 IntroView·1단계 안내 문구와 같은 내용.
 * 의료 서비스로 오해되지 않게 "치료·진단" 같은 말로 약속하지 않고, 도움 기관 연락처는 팀이 정하기 전까지 넣지 않는다.
 */
const FAQ: { q: string[]; a: string[] }[] = [
  {
    q: ['준비물이 필요한가요?', '이력서도 있어야 하나요?'],
    a: ['이력서나 자료는 필요 없어요!', '마이크·카메라가 있는 컴퓨터와 크롬(또는 엣지) 브라우저면 충분해요.'],
  },
  {
    q: ['세 단계를 한 번에 다 해야 하나요?'],
    a: ['아니요, 오늘은 1단계만 해도 괜찮아요.', '단계마다 멈출 수 있고, 다음에 이어서 하면 돼요. 결과 리포트는 세 단계를 다 마친 뒤 한 번에 보여 드려요.'],
  },
  {
    q: ['제 얼굴이나 목소리가 저장되나요?'],
    a: [
      '영상과 음성 파일은 저장하지 않아요. 표정·시선은 내 브라우저 안에서 바로 살펴보고 숫자 요약만 남겨요.',
      '3단계 면접의 질문과 대답 글은 내 계정에 저장되고, 질문을 만들기 위해 AI로 보내져요. 결과 화면에서 언제든 지울 수 있어요.',
    ],
  },
  {
    q: ['하루는 누구인가요?'],
    a: ['1·2단계에서 함께 이야기하는 AI 대화 친구예요.', '정해진 질문을 하고 대답에 짧게 반응해 줄 뿐, 평가하거나 조언하지 않아요.'],
  },
  {
    q: ['점수나 등급으로 평가하나요?'],
    a: ['아니요. 점수 대신 "가끔 있어요", "지금처럼 하면 돼요" 같은 말과 실제로 센 횟수만 보여 드려요.'],
  },
  {
    q: ['말이 막히거나 대답하기 어려우면요?'],
    a: ['대답하지 않고 넘어가도 괜찮아요. 질문을 다시 들려 달라고 할 수도 있고, 언제든 그만둘 수 있어요.'],
  },
  {
    q: ['상담이나 치료를 대신할 수 있나요?'],
    a: [
      'Re-born은 말하기와 마주하기를 연습하는 서비스이고, 의료나 상담 서비스가 아니에요.',
      '마음이 많이 힘들다면 혼자 견디지 말고 가까운 사람이나 전문 상담에 도움을 요청해 주세요.',
    ],
  },
  {
    q: ['마이크나 카메라가 안 잡혀요.'],
    a: ['주소창 왼쪽 자물쇠 아이콘을 눌러 마이크·카메라를 "허용"으로 바꾼 뒤 새로고침해 주세요.', '화상 회의 같은 다른 프로그램이 카메라를 쓰고 있으면 먼저 꺼 주세요.'],
  },
];

/**
 * 맨 위 메뉴줄 — 메인 화면(Landing.tsx의 Nav)과 같은 모양: 왼쪽 로고, 오른쪽 메뉴, 아래 테두리.
 * "뒤로" 줄이 붙는 PageHeader 대신 메인과 똑같은 한 줄만 둔다. 메인의 Nav에서 여백·로고 크기를 바꾸면 여기도 같은 숫자로 맞출 것.
 */
function FaqNav() {
  return (
    <header
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid var(--rb-line)',
        background: 'var(--rb-surface)',
      }}
    >
      <Link to="/" aria-label="메인 화면으로">
        <RebornWordmark size={36} animate={false} />
      </Link>
      <SiteNavLinks />
    </header>
  );
}

/** 말풍선 하나. who: Q(왼쪽, 흰색) / A(오른쪽, 초록) */
function Bubble({ who, children }: { who: 'Q' | 'A'; children: string }) {
  const isQ = who === 'Q';
  return (
    <div
      style={{
        alignSelf: isQ ? 'flex-start' : 'flex-end',
        maxWidth: 'min(560px, 88%)',
        display: 'flex',
        gap: 8,
        padding: '14px 22px',
        borderRadius: 28,
        fontSize: 16,
        lineHeight: 1.65,
        background: isQ ? 'var(--rb-surface)' : 'var(--rb-primary)',
        color: isQ ? 'var(--rb-ink)' : '#fff',
        boxShadow: isQ ? '0 1px 2px rgba(21,24,28,.06)' : 'none',
        border: isQ ? '1px solid var(--rb-line)' : 'none',
      }}
    >
      <b style={{ flex: 'none', color: isQ ? 'var(--rb-ink-faint)' : 'rgba(255,255,255,.72)' }}>{who}.</b>
      <span style={{ wordBreak: 'keep-all' }}>{children}</span>
    </div>
  );
}

export default function FaqPage() {
  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 72 }}>
      <FaqNav />

      <Box style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 0' }}>
        {/* 큰 "FAQ" 제목 + 오른쪽 "자주 묻는 질문" + 밑줄 */}
        <header style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 36 }}>
          <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--rb-ink)' }}>FAQ</h1>
          <div style={{ flex: 1, borderBottom: '2px solid var(--rb-ink)', paddingBottom: 6, textAlign: 'right' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--rb-ink)' }}>자주 묻는 질문</span>
          </div>
        </header>

        <div style={{ display: 'grid', gap: 36 }}>
          {FAQ.map((f) => (
            <section key={f.q[0]} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {f.q.map((t) => (
                <Bubble key={t} who="Q">
                  {t}
                </Bubble>
              ))}
              {f.a.map((t) => (
                <Bubble key={t} who="A">
                  {t}
                </Bubble>
              ))}
            </section>
          ))}
        </div>

        <Box
          style={{
            marginTop: 48,
            background: 'var(--rb-primary-tint)',
            border: '1px solid var(--rb-line)',
            borderRadius: 14,
            padding: 20,
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
