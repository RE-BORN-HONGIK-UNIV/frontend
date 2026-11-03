import { useEffect, useState } from 'react';
import type { useLiveFaceSession } from './useLiveFaceSession';
import type { DebugLabels } from './debugLog';

type Session = ReturnType<typeof useLiveFaceSession>;

const f = (v: number | null, d = 2) => (v === null ? '—' : v.toFixed(d));
const GAZE_LABEL: Record<DebugLabels['gaze'], string> = { '': '표시 안 함', haru: '하루 보는 중', away: '다른 곳 보는 중' };
const SMILE_LABEL: Record<DebugLabels['smile'], string> = { '': '표시 안 함', smile: '웃는 중', none: '안 웃음' };

function Row({ name, value, ok, hint }: { name: string; value: string; ok?: boolean | null; hint?: string }) {
  return (
    <tr>
      <td style={{ padding: '2px 10px 2px 0', color: 'var(--rb-ink-soft)' }}>{name}</td>
      <td style={{ padding: '2px 10px 2px 0', fontWeight: 700, color: ok === undefined || ok === null ? 'var(--rb-ink)' : ok ? 'var(--rb-primary-strong)' : 'var(--rb-amber-strong)' }}>
        {value}
      </td>
      <td style={{ padding: '2px 0', color: 'var(--rb-ink-faint)' }}>{hint}</td>
    </tr>
  );
}

/**
 * 2단계 확인용 디버그 패널(/face?debug=1에서만) — 하루 영상 통화(내 얼굴이 안 보임) 조건에서
 * 시선·미소 판정이 맞는지 직접 확인하고, 정답 표시와 함께 숫자 기록을 CSV로 내려받는다(영상은 저장 안 함).
 * 정답 표시는 시선을 옮기지 않아도 되게 키보드로: 1 하루 보는 중 · 2 다른 곳 · 0 표시 안 함 / S 웃는 중 · N 안 웃음 · M 표시 안 함.
 */
export function FaceDebugPanel({ s }: { s: Session }) {
  const [labels, setLabels] = useState<DebugLabels>({ gaze: '', smile: '' });
  const d = s.debugSnapshot;

  useEffect(() => {
    s.setDebugLabels(labels);
  }, [labels, s]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === '1') setLabels((l) => ({ ...l, gaze: 'haru' }));
      else if (k === '2') setLabels((l) => ({ ...l, gaze: 'away' }));
      else if (k === '0') setLabels((l) => ({ ...l, gaze: '' }));
      else if (k === 's') setLabels((l) => ({ ...l, smile: 'smile' }));
      else if (k === 'n') setLabels((l) => ({ ...l, smile: 'none' }));
      else if (k === 'm') setLabels((l) => ({ ...l, smile: '' }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const download = () => {
    const blob = new Blob([s.debugCsv()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stage2-debug-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section
      aria-label="2단계 확인용 디버그"
      style={{ border: '1px dashed var(--rb-line-strong)', borderRadius: 12, padding: 14, fontSize: 13, background: 'var(--rb-surface-tint)' }}
    >
      <strong style={{ fontSize: 13 }}>디버그 (debug=1) · 기록 {s.debugFrameCount()}프레임</strong>
      {!d ? (
        <p style={{ margin: '8px 0 0', color: 'var(--rb-ink-soft)' }}>통화가 시작되면 판정값이 보여요.</p>
      ) : (
        <table style={{ marginTop: 8, borderCollapse: 'collapse' }}>
          <tbody>
            <Row name="결과에 넣는 중" value={d.measuring ? '예 (대답하는 중)' : '아니요'} ok={d.measuring} hint="대답하는 동안만 잼" />
            <Row name="얼굴" value={d.detected ? '잡힘' : '안 잡힘'} ok={d.detected} hint="안 잡히면 시선 회피로 계산" />
            <Row name="시선 판정" value={d.looking ? '하루 보는 중' : '회피'} ok={d.looking} />
            <Row name="고개 좌우·상하" value={`${f(d.yawDev, 1)}° / ${f(d.pitchDev, 1)}°`} ok={d.yawDev === null ? null : Math.abs(d.yawDev) < 10 && Math.abs(d.pitchDev ?? 0) < 10} hint="기준 대비, ±10° 안이면 통과" />
            <Row name="눈동자 좌우·상하" value={`${f(d.irisX)} / ${f(d.irisY)}`} ok={d.irisX === null ? null : Math.abs(d.irisX) < 0.15 && Math.abs(d.irisY ?? 0) < 0.15} hint="±0.15 안이면 통과 (기준값 보정 없음)" />
            <Row name="미소" value={`${f(d.smile)} (원래 ${f(d.smileRaw)}, 입 벌림 ${f(d.jawOpen)})`} ok={d.smile === null ? null : d.smile >= 0.35} hint="0.35 이상이면 미소 · 입 벌림 0.05 초과면 0.5 미만 미소는 0으로" />
            <Row name="긴장" value={f(d.tension)} hint="0.4 이상이면 굳은 표정" />
          </tbody>
        </table>
      )}
      <p style={{ margin: '10px 0 6px' }}>
        정답 표시: 시선 <b>{GAZE_LABEL[labels.gaze]}</b> · 미소 <b>{SMILE_LABEL[labels.smile]}</b>
        <br />
        <span style={{ color: 'var(--rb-ink-faint)' }}>키보드: 1 하루 보는 중 · 2 다른 곳 · 0 해제 / S 웃는 중 · N 안 웃음 · M 해제</span>
      </p>
      <button type="button" onClick={download} style={{ border: '1px solid var(--rb-line-strong)', background: 'var(--rb-surface)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--rb-ink)' }}>
        숫자 기록 CSV 내려받기 (영상은 저장 안 함)
      </button>
    </section>
  );
}
