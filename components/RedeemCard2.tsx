"use client";
import { useState } from "react";
import RedeemModal from "./RedeemModal";

export default function RedeemCard2({ provider, value, pointsRequired, availableCount = 0 }: { provider: string; value: number; pointsRequired: number; availableCount?: number }) {
  const [open, setOpen] = useState(false);

  function handleRedeem() {
    setOpen(true);
  }

  // Format value to display as "Thẻ 50k", "Thẻ 30k" etc
  const valueDisplay = value >= 1000 ? `${value / 1000}k` : `${value}`;

  // Logo path dựa vào provider
  const logoPath = `/images/${provider?.toLowerCase()}.png`;

  return (
    <div className="redeem-card-v2" role="group" aria-label={`Thẻ ${valueDisplay} - ${pointsRequired} điểm`} tabIndex={0}>
      {/* Tag số lượng góc trên phải */}
      {availableCount > 0 && (
        <div className="quantity-tag" aria-label={`Còn ${availableCount} thẻ`}>
          x{availableCount}
        </div>
      )}

      <div className="redeem-card-content">
        {/* Logo nhà mạng bên trái */}
        <div className="redeem-card-image" aria-hidden>
          <div className="provider-logo">
            <img
              src={logoPath}
              alt={provider}
              onError={(e: any) => { e.currentTarget.src = '/images/logo.png'; }}
            />
          </div>
        </div>

        {/* Thông tin bên phải */}
        <div className="redeem-card-info">
          <div className="redeem-provider-name">{provider}</div>
          <div className="redeem-value-label">Thẻ {valueDisplay}</div>
          <div className="redeem-points-required">{pointsRequired} điểm</div>
        </div>
      </div>

      {/* Nút Quy đổi */}
      <button
        onClick={handleRedeem}
        className="btn-redeem"
        disabled={availableCount === 0}
        aria-disabled={availableCount === 0}
        aria-label={`Quy đổi Thẻ ${valueDisplay}`}
      >
        {availableCount === 0 ? "Hết hàng" : (
          <>
            Quy đổi
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6h15l-1.5 9h-12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="19" r="1.5" fill="currentColor" />
              <circle cx="18" cy="19" r="1.5" fill="currentColor" />
            </svg>
          </>
        )}
      </button>

      <RedeemModal open={open} onClose={() => setOpen(false)} card={{ provider, value, pointsRequired }} />
    </div>
  );
}
