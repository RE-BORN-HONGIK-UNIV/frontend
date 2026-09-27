import { Link } from 'react-router-dom';
import { Anchor, Group } from '@/components/ui';

export type SiteNavActive = 'training' | 'community';

/**
 * 훈련/이야기/문의 링크 — Landing.tsx, PageHeader.tsx(Dashboard/음성/표정/면접),
 * CommunityShell.tsx(이야기) 세 군데가 각자 따로 들고 있다가 하나씩 빠뜨리는
 * 문제(훈련 링크가 Landing에만 있고 나머지엔 없었음)가 생겨서 공용으로 뽑음.
 * active로 지금 있는 화면을 굵은 브랜드 그린으로 표시.
 */
export function SiteNavLinks({ active }: { active?: SiteNavActive }) {
  return (
    <Group gap={32} visibleFrom="sm">
      <Anchor
        component={Link}
        to="/dashboard"
        fz={14}
        underline="never"
        c={active === 'training' ? 'var(--rb-primary-strong)' : 'var(--rb-ink-soft)'}
        fw={active === 'training' ? 700 : 400}
      >
        훈련
      </Anchor>
      <Anchor
        component={Link}
        to="/community"
        fz={14}
        underline="never"
        c={active === 'community' ? 'var(--rb-primary-strong)' : 'var(--rb-ink-soft)'}
        fw={active === 'community' ? 700 : 400}
      >
        이야기
      </Anchor>
      {/* 절대경로 + 해시로 둬서 다른 페이지에서 눌러도 랜딩의 #contact로 이동 —
       * 기존엔 "#contact"만 있어서 랜딩이 아닌 페이지에선 아무 데도 안 움직였음 */}
      <Anchor href="/#contact" c="var(--rb-ink-soft)" fz={14} underline="never">
        문의
      </Anchor>
    </Group>
  );
}
