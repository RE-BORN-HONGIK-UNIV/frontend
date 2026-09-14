import { showToast } from '@/components/ui/Toaster';

/**
 * 전역 알림. 어느 컴포넌트에서든 import해서 바로 호출하면
 * main.tsx에 한 번만 마운트된 <Toaster />가 화면에 띄워준다.
 */
export const toast = {
  success: (message: string, title?: string) => showToast(message, 'brand', title),
  error: (message: string, title?: string) => showToast(message, 'red', title),
  info: (message: string, title?: string) => showToast(message, 'gray', title),
};
