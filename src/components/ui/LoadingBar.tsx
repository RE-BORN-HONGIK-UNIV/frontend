/** 화면/단계 전환 중 로딩 표시. 인라인 스피너(Button의 loading prop 등)와는
 * 다른 용도 — 페이지·섹션 단위로 "지금 기다리는 중"을 보여줄 때 씀. */
export function LoadingBar({ label = '불러오는 중' }: { label?: string }) {
  return (
    <div className="rb-loadingbar" role="status" aria-label={label}>
      <p className="rb-loadingbar-text" aria-hidden="true">
        {label}
      </p>
      <span className="rb-loadingbar-load" aria-hidden="true" />
    </div>
  );
}
