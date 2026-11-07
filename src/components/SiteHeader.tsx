import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RebornWordmark } from './RebornWordmark';
import { SiteNavLinks, type SiteNavActive } from './SiteNavLinks';
import { Anchor, Group, Text } from '@/components/ui';
import { LogoutButton } from './LogoutButton';
import { auth } from '@/lib/auth';

/** 오른쪽 끝 계정 — 모든 화면 같게(예전엔 메인은 '로그인', 다른 화면은 '이름님 · 로그아웃'이라 메뉴가 밀려 보였다).
 * 로그인했으면(게스트 포함) 이름 + 로그아웃(게스트는 기록이 사라진다고 먼저 알림), 아니면 로그인 */
function Account() {
  if (!auth.isAuthed())
    return (
      <Anchor component={Link} to="/login" c="var(--rb-ink-soft)" fz={14} underline="never">
        로그인
      </Anchor>
    );
  return (
    <Group gap={14}>
      <Text fz={14} c="var(--rb-ink-soft)">
        {auth.name || '회원'}님
      </Text>
      <LogoutButton />
    </Group>
  );
}

/**
 * 맨 위 머리줄(로고 + 이야기·자주 묻는 질문·마이페이지 + 계정) — 메인·FAQ·마이페이지·이야기가 함께 쓴다.
 *
 * 예전엔 화면마다 머리줄을 따로 만들어서, 메인은 좌우 여백 30px·FAQ와 마이페이지는 40px·이야기는 로고 앞에 사이드바
 * 버튼이 있어 로고가 86px에 놓이고, 메뉴 높이도 4px씩 달랐다 — 화면을 오갈 때마다 머리줄이 움직여 보였다. 이제 높이·
 * 여백·로고 크기·위치를 여기 한 곳(index.css .rb-siteheader)에서 정한다.
 * 1·2·3단계와 결과 화면은 단계 표시가 있는 StageHeader를 따로 쓴다.
 */
export function SiteHeader({
  active,
  afterLogo,
  bordered = true,
}: {
  active?: SiteNavActive;
  /** 로고 바로 뒤(이야기의 사이드바 열기 버튼) — 로고 자리는 모든 화면에서 같게 */
  afterLogo?: ReactNode;
  /** 아래 줄 — 마이페이지처럼 머리줄과 제목이 한 흰 판일 땐 끈다(줄은 판 전체 아래에 있음) */
  bordered?: boolean;
}) {
  return (
    <header className="rb-siteheader" data-bordered={bordered || undefined}>
      <div className="rb-siteheader__left">
        <Link to="/" aria-label="메인 화면으로">
          <RebornWordmark size={36} animate={false} />
        </Link>
        {afterLogo}
      </div>
      <div className="rb-siteheader__right">
        <SiteNavLinks active={active} />
        <Account />
      </div>
    </header>
  );
}
