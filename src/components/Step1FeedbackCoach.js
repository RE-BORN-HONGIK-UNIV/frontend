import React, { useEffect, useState } from 'react';

/**
 * Step 1 · AI 코칭 피드백
 *
 * /analyze 결과(result)를 백엔드 /analyze/feedback(LLM)로 보내
 * 공감형 코칭 문단을 비동기로 받아 표시한다.
 * 호출이 실패하거나 키가 없으면 props.fallback(결정론적 템플릿 문구)을 그대로 보여준다.
 */
export default function Step1FeedbackCoach({ result, fallback }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setText(null);
    setLoading(true);

    fetch('/analyze/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    })
      .then((r) => r.json())
      .then((fb) => {
        if (alive && fb && fb.feedback) setText(fb.feedback);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [result]);

  return (
    <p
      style={{
        fontSize: 13,
        lineHeight: 1.8,
        color: '#1a1a1a',
        margin: '14px 0 0',
        paddingTop: 12,
        borderTop: '1px solid #f0f0f0',
      }}
    >
      {text || fallback}
      {loading && !text && (
        <span style={{ color: '#A98FD9' }}> · AI 코치가 분석 중…</span>
      )}
    </p>
  );
}
