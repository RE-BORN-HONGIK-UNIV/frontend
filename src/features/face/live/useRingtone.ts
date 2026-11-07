import { useEffect } from 'react';

/**
 * 하루에게서 영상 통화가 올 때(전화 오는 화면) 울리는 벨소리 — 2026-11.
 *
 * 파일 없이 브라우저(Web Audio)로 직접 만든다 — 저작권 걱정이 없고 내려받을 것도 없다. 사회불안 사용자를 놀라게 하지
 * 않게 날카로운 전화벨(두 음 섞은 소리) 대신 부드러운 세 음 차임('띠-리-링')을 2.4초마다, 작은 소리(최대 0.12)로 울린다.
 * "통화 시작하기"를 누른 직후라 브라우저의 자동 재생 제한에 걸리지 않는다. 응답·거절하면(active=false) 바로 멈춘다.
 */
const NOTES_HZ = [659.25, 830.61, 987.77]; // E5 · G#5 · B5 (밝은 장3화음)
const NOTE_GAP_S = 0.16;
const NOTE_LEN_S = 0.5;
const REPEAT_MS = 2400;
const PEAK_GAIN = 0.12;

export function useRingtone(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    let ctx: AudioContext;
    try {
      ctx = new Ctx();
    } catch {
      return;
    }

    const chime = () => {
      if (ctx.state === 'suspended') void ctx.resume();
      const t0 = ctx.currentTime + 0.02;
      NOTES_HZ.forEach((hz, i) => {
        const start = t0 + i * NOTE_GAP_S;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = hz;
        // 톡 치고 서서히 사라지는 소리(마림바처럼)
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(PEAK_GAIN, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_LEN_S);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + NOTE_LEN_S + 0.05);
      });
    };

    chime();
    const id = window.setInterval(chime, REPEAT_MS);
    return () => {
      window.clearInterval(id);
      void ctx.close();
    };
  }, [active]);
}
