import type { ReactNode } from 'react';
import { IconBriefcase, IconChatBubble, IconMegaphone, IconUsers } from '@/components/ui';

export interface CommunityCategory {
  id: string;
  label: string;
  icon: ReactNode;
  /** 백엔드가 지금은 '자유게시판'(GET/POST /community/posts) 하나만 지원해서,
   * 나머지 카테고리는 UI만 먼저 만들어둔 상태. 실제 게시판이 추가되면
   * available을 true로 바꾸고, API에 카테고리(board) 파라미터를 붙이면 됨. */
  available: boolean;
}

export const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  { id: 'free', label: '자유게시판', icon: <IconChatBubble />, available: true },
  { id: 'jobs', label: '공채·인턴', icon: <IconBriefcase />, available: false },
  { id: 'activities', label: '대외활동·공모전', icon: <IconMegaphone />, available: false },
  { id: 'together', label: '같이해요', icon: <IconUsers />, available: false },
];
