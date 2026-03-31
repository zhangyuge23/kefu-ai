'use client';

import { useState } from 'react';

export default function CDKeyRedeem({ onSuccess }: { onSuccess?: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleRedeem() {
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/cdkey/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: `兑换成功！获得 ${data.credits} 点算力` });
        setCode('');
        onSuccess?.();
      } else {
        setMessage({ type: 'error', text: data.error || '兑换失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误，请重试' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <h3 className="font-medium text-slate-700 mb-3">CDKey 兑换</h3>
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder="输入兑换码"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRedeem()}
        />
        <button
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          className="btn-primary whitespace-nowrap"
        >
          {loading ? '兑换中...' : '兑换'}
        </button>
      </div>
      {message && (
        <p className={`text-sm mt-2 ${message.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
