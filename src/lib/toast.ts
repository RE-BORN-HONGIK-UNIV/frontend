import { notifications } from '@mantine/notifications';

/**
 * 전역 알림. 어느 컴포넌트에서든 import해서 바로 호출하면
 * main.tsx에 한 번만 마운트된 <Notifications />가 화면에 띄워준다.
 */
export const toast = {
  success: (message: string, title?: string) =>
    notifications.show({ title, message, color: 'brand' }),

  error: (message: string, title?: string) =>
    notifications.show({ title, message, color: 'red' }),

  info: (message: string, title?: string) =>
    notifications.show({ title, message, color: 'gray' }),
};
