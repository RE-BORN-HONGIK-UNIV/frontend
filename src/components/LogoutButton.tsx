import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Anchor, Button, Group, Modal, Text } from '@/components/ui';
import { auth } from '@/lib/auth';
import { clearLocalUserData } from '@/lib/clearLocalUserData';

/** 상단바의 "로그아웃" — 누르면 화면 가운데 확인 창을 띄운다(게스트는 기록이 사라진다고 먼저 알린다) */
export function LogoutButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const guest = auth.isGuest;

  const logout = () => {
    auth.signOut();
    clearLocalUserData();
    // 서버에서 받아 둔 이전 사람의 기록(대시보드 진행, 면접 목록 등)이 화면에 남지 않게
    queryClient.clear();
    setOpen(false);
    navigate('/', { replace: true });
  };

  return (
    <>
      <Anchor fz={14} c="var(--rb-ink-soft)" onClick={() => setOpen(true)}>
        로그아웃
      </Anchor>
      <Modal opened={open} onClose={() => setOpen(false)} title="로그아웃할까요?" centered>
        <Text fz={15} c="var(--rb-ink)" style={{ lineHeight: 1.7 }}>
          {guest ? (
            <>
              로그아웃하면 <b>지금까지의 기록은 저장되지 않아요.</b>
              <br />
              다음에 시작할 때는 불러 드릴 이름부터 새로 정해요.
            </>
          ) : (
            <>
              다시 로그인하면 기록을 이어서 볼 수 있어요.
              <br />이 기기에 남은 진행 표시는 지워져요.
            </>
          )}
        </Text>
        <Group justify="flex-end" gap={10} mt={22}>
          <Button variant="default" radius="md" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button color={guest ? 'red' : 'brand'} radius="md" onClick={logout}>
            로그아웃
          </Button>
        </Group>
      </Modal>
    </>
  );
}
