"use client";
import { useState } from "react";

type CardInfo = {
  provider?: string;
  value?: number;
  pointsRequired?: number;
  code?: string;
  serial?: string;
};

export default function RedeemModal({ open, onClose, card }: { open: boolean; onClose: () => void; card?: CardInfo }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cardResult, setCardResult] = useState<CardInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function confirmRedeem() {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      let userId: string | null = null;
      let userPoints: number = 0;

      try {
        const auth = await import("../lib/auth");
        const profile = await auth.getCurrentUserProfile();
        userId = profile?.uid ?? null;
        userPoints = profile?.greenPoints ?? 0;
      } catch (e) {
        // ignore
      }

      // Kiểm tra đăng nhập
      if (!userId) {
        setError("Vui lòng đăng nhập trước khi đổi thẻ.");
        setLoading(false);
        return;
      }

      // Kiểm tra đủ điểm phía client (double check)
      if (userPoints < (card?.pointsRequired || 0)) {
        setError(`Bạn không đủ điểm. Cần ${card?.pointsRequired} điểm, bạn có ${userPoints} điểm.`);
        setLoading(false);
        return;
      }

      // Gọi API đổi thẻ
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: card?.provider,
          value: card?.value,
          pointsRequired: card?.pointsRequired ?? 0,
          userId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle specific errors
        if (data.error === "no_card") {
          setError("Xin lỗi, thẻ hiện không còn sẵn. Vui lòng thử loại khác.");
        } else if (data.error === "insufficient_points") {
          setError("Không đủ điểm để đổi thẻ này.");
        } else if (data.error === "card_already_used") {
          setError("Thẻ này đã được người khác đổi. Vui lòng thử lại.");
        } else {
          setError(data.message || "Lỗi khi đổi thẻ. Vui lòng thử lại.");
        }
        setLoading(false);
        return;
      }

      // Thành công - lưu thông tin thẻ
      setCardResult({
        provider: card?.provider,
        value: card?.value,
        code: data.code,
        serial: data.serial,
        pointsRequired: card?.pointsRequired
      });
      setSuccess(true);

    } catch (err) {
      console.error("Redeem failed", err);
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    const codeToCopy = cardResult?.code || '';
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  function handleClose() {
    // Reset state when closing
    setSuccess(false);
    setCardResult(null);
    setError(null);
    setCopied(false);
    onClose();
  }

  return (
    <div className="redeem-modal-backdrop" role="dialog" aria-modal="true" onClick={handleClose}>
      <div className="redeem-modal-card" onClick={(e) => e.stopPropagation()}>

        {!success ? (
          <>
            {/* Xác nhận đổi thẻ */}
            <div className="redeem-modal-header">
              <div className="redeem-modal-icon confirm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
                  <path d="M12 7v5M12 15v1" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Xác nhận đổi thẻ</h3>
            </div>

            <div className="redeem-modal-body">
              <div className="redeem-info-card">
                <div className="redeem-info-row">
                  <span className="label">Loại thẻ:</span>
                  <span className="value">{card?.provider}</span>
                </div>
                <div className="redeem-info-row">
                  <span className="label">Mệnh giá:</span>
                  <span className="value">{card?.value?.toLocaleString()}₫</span>
                </div>
                <div className="redeem-info-row highlight">
                  <span className="label">Điểm cần:</span>
                  <span className="value">{card?.pointsRequired} điểm</span>
                </div>
              </div>

              <p className="redeem-warning">
                ⚠️ Điểm sẽ được trừ ngay khi xác nhận. Hãy chắc chắn bạn muốn đổi thẻ này.
              </p>

              {error && (
                <div className="redeem-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
                    <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="redeem-modal-actions">
              <button className="btn-cancel" onClick={handleClose} disabled={loading}>Hủy</button>
              <button className="btn-confirm" onClick={confirmRedeem} disabled={loading}>
                {loading ? (
                  <span className="loading-text">
                    <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
                    </svg>
                    Đang xử lý...
                  </span>
                ) : (
                  "Xác nhận đổi"
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Thành công */}
            <div className="redeem-modal-header success">
              <div className="redeem-modal-icon success">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="11" fill="#dcfce7" />
                  <path d="M7.5 12.5l2.5 2.5L16.5 9.5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Đổi thẻ thành công!</h3>
              <p className="success-subtitle">Cảm ơn bạn đã sử dụng GreenHabit AI</p>
            </div>

            <div className="redeem-modal-body">
              <div className="redeem-success-card">
                <div className="card-type">
                  {cardResult?.provider} - {cardResult?.value?.toLocaleString()}₫
                </div>

                <div className="code-section">
                  <label>Mã thẻ</label>
                  <div className="code-display">
                    <span className="code-value">{cardResult?.code || "—"}</span>
                    <button className="btn-copy" onClick={copyCode}>
                      {copied ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Đã sao chép
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          Sao chép
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {cardResult?.serial && (
                  <div className="serial-section">
                    <label>Serial</label>
                    <div className="serial-value">{cardResult.serial}</div>
                  </div>
                )}

                <div className="points-deducted">
                  Đã trừ <strong>{cardResult?.pointsRequired}</strong> điểm
                </div>
              </div>

              <p className="redeem-note">
                💡 Thẻ đã được lưu vào lịch sử. Bạn có thể xem lại bất cứ lúc nào.
              </p>
            </div>

            <div className="redeem-modal-actions">
              <button className="btn-close-success" onClick={handleClose}>Đóng</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
