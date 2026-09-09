// 지금은 백엔드 엔드포인트가 없어서 가짜로 동작함.
// 나중에 실제 API 완성되면 이 함수 내부만 fetch로 교체하면 됨.
export async function uploadAnswer(blob: Blob): Promise<{ ok: true }> {
  console.log('[mock] 답변 업로드 시뮬레이션, 파일 크기:', blob.size, 'bytes');
  await new Promise((r) => setTimeout(r, 600)); // 네트워크 지연 흉내
  return { ok: true };
}