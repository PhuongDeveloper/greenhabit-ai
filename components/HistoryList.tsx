"use client";
import React, { useEffect, useState } from "react";
import { fetchRedeems } from "../lib/db";
import { onAuthStateChangedListener } from "../lib/auth";

type HistoryItem = {
  id: string;
  createdAt: any;
  value: number;
  status?: string;
  provider?: string;
  code?: string;
  serial?: string;
};

// Modal xem chi tiết thẻ
function CardDetailModal({ item, onClose }: { item: HistoryItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return "—";
    }
  };

  async function copyCode() {
    if (!item.code) return;
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="card-detail-backdrop" onClick={onClose}>
      <div className="card-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="card-detail-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="card-detail-header">
          <div className="card-detail-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="#22c55e" strokeWidth="2" />
              <path d="M2 10h20" stroke="#22c55e" strokeWidth="2" />
            </svg>
          </div>
          <h3>Chi tiết thẻ</h3>
        </div>

        <div className="card-detail-body">
          <div className="detail-row">
            <span className="label">Loại thẻ</span>
            <span className="value">{item.provider}</span>
          </div>
          <div className="detail-row">
            <span className="label">Mệnh giá</span>
            <span className="value highlight">{item.value?.toLocaleString()}₫</span>
          </div>
          <div className="detail-row">
            <span className="label">Trạng thái</span>
            <span className={`status-badge ${item.status === "Thành công" ? "success" : "pending"}`}>
              {item.status}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Thời gian</span>
            <span className="value">{formatDate(item.createdAt)}</span>
          </div>

          {item.code && (
            <div className="code-section">
              <label>Mã thẻ</label>
              <div className="code-box">
                <span className="code-value">{item.code}</span>
                <button className="btn-copy-sm" onClick={copyCode}>
                  {copied ? "✓" : "📋"}
                </button>
              </div>
            </div>
          )}

          {item.serial && (
            <div className="serial-section">
              <label>Serial</label>
              <div className="serial-value">{item.serial}</div>
            </div>
          )}
        </div>

        <div className="card-detail-footer">
          <button className="btn-close-detail" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

export default function HistoryList() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Đợi auth ready
  useEffect(() => {
    const unsub = onAuthStateChangedListener((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setHistory([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Load history khi có userId
  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    async function loadHistory() {
      setLoading(true);
      try {
        const redeems = await fetchRedeems(50);

        if (!mounted) return;

        // Lọc theo user hiện tại
        const userRedeems = redeems.filter((r: any) => r.userId === userId);

        const mapped = userRedeems.slice(0, 10).map((r: any) => ({
          id: r.id,
          createdAt: r.createdAt,
          value: r.value || 0,
          status: r.status || "Thành công",
          provider: r.provider || "",
          code: r.code || "",
          serial: r.serial || "",
        }));

        setHistory(mapped);
      } catch (err) {
        console.error("Load history error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadHistory();
    return () => { mounted = false; };
  }, [userId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toISOString().split('T')[0];
    } catch {
      return "—";
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000) return `Thẻ ${value / 1000}k`;
    return `Thẻ ${value}`;
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className="history-list-v2">
        {[1, 2].map((i) => (
          <div key={i} className="history-row skeleton-row">
            <div className="skeleton-text" style={{ width: 80 }}></div>
            <div className="skeleton-text" style={{ width: 60 }}></div>
            <div className="skeleton-text" style={{ width: 70 }}></div>
          </div>
        ))}
      </div>
    );
  }

  // Chưa đăng nhập
  if (!userId) {
    return (
      <div className="history-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" stroke="#9ca3af" strokeWidth="1.5" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p>Đăng nhập để xem lịch sử quy đổi</p>
      </div>
    );
  }

  // Không có lịch sử
  if (history.length === 0) {
    return (
      <div className="history-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="#9ca3af" strokeWidth="1.5" />
          <path d="M3 10h18" stroke="#9ca3af" strokeWidth="1.5" />
          <circle cx="7" cy="14" r="1" fill="#9ca3af" />
          <path d="M11 14h6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p>Chưa có lịch sử quy đổi</p>
      </div>
    );
  }

  return (
    <>
      <div className="history-list-v2">
        {history.map((h) => (
          <div
            key={h.id}
            className="history-row clickable"
            role="button"
            tabIndex={0}
            onClick={() => setSelectedItem(h)}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedItem(h)}
          >
            <div className="history-col-date">{formatDate(h.createdAt)}</div>
            <div className="history-col-label">{formatValue(h.value)}</div>
            <div className={`history-col-status ${h.status === "Thành công" ? "success" : "pending"}`}>
              {h.status === "Thành công" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="10" fill="#dcfce7" />
                  <path d="M8 12l2.5 2.5L16 9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span>{h.status}</span>
            </div>
            <div className="history-view-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Modal chi tiết */}
      {selectedItem && (
        <CardDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
}
