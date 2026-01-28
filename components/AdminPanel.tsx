"use client";
import { useState } from "react";

export default function AdminPanel() {
  const [authorized, setAuthorized] = useState(false);
  const [pwd, setPwd] = useState("");
  const [provider, setProvider] = useState("Viettel");
  const [value, setValue] = useState(10000);
  const [pointsRequired, setPointsRequired] = useState(100);
  const [code, setCode] = useState("");
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function checkPwd(e: React.FormEvent) {
    e.preventDefault();
    if (pwd === "050128") {
      setAuthorized(true);
      setMessage(null);
    } else {
      setMessage("Mật khẩu không đúng");
    }
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { addCardToFirestore } = await import("../lib/db");
      await addCardToFirestore({
        provider,
        value,
        pointsRequired,
        code,
        serial,
        used: false
      });
      setMessage("Đã thêm thẻ thành công");
      setCode("");
      setSerial("");
    } catch (err) {
      console.error(err);
      setMessage("Thêm thẻ thất bại");
    } finally {
      setLoading(false);
    }
  }

  if (!authorized) {
    return (
      <div className="card" style={{ maxWidth: 540 }}>
        <h3 className="font-semibold">Admin - Đăng nhập</h3>
        <form onSubmit={checkPwd} style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <input aria-label="Mật khẩu admin" value={pwd} onChange={(e) => setPwd(e.target.value)} className="input-field" placeholder="Mật khẩu" />
          <button className="btn btn-primary" type="submit">Mở</button>
        </form>
        {message ? <div style={{ marginTop: 8 }} className="muted">{message}</div> : null}
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h3 className="font-semibold">Admin - Thêm thẻ</h3>
      <form onSubmit={handleAddCard} style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>
          Nhà mạng
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input-field">
            <option>Viettel</option>
            <option>Vinaphone</option>
            <option>Garena</option>
          </select>
        </label>

        <label>
          Giá trị (VNĐ)
          <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="input-field" />
        </label>

        <label>
          Điểm yêu cầu
          <input type="number" value={pointsRequired} onChange={(e) => setPointsRequired(Number(e.target.value))} className="input-field" />
        </label>

        <label>
          Mã thẻ
          <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field" />
        </label>

        <label style={{ gridColumn: '1 / -1' }}>
          Serial (tuỳ chọn)
          <input value={serial} onChange={(e) => setSerial(e.target.value)} className="input-field" />
        </label>

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button className="btn btn-secondary" type="button" onClick={() => { setAuthorized(false); setPwd(''); }}>Đăng xuất</button>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Đang...' : 'Thêm thẻ'}</button>
        </div>
      </form>
      {message ? <div style={{ marginTop: 12 }} className="muted">{message}</div> : null}
    </div>
  );
}
