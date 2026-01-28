"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [provider, setProvider] = useState("Viettel");
  const [value, setValue] = useState<number>(10000);
  const [pointsRequired, setPointsRequired] = useState<number>(100);
  const [code, setCode] = useState("");
  const [serial, setSerial] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [loading, setLoading] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // Data states
  const [cards, setCards] = useState<any[] | null>(null);
  const [redeems, setRedeems] = useState<any[] | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"add" | "cards" | "history" | "points">("add");

  // Points management states
  const [dailyGrowth, setDailyGrowth] = useState<any[]>([]);
  const [teamsWithGrowth, setTeamsWithGrowth] = useState<any[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  // Snapshot progress states
  const [snapshotProgress, setSnapshotProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  function checkPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password === "050128") {
      setAuthorized(true);
      setMessage(null);
    } else {
      setMessage("Mật khẩu sai");
      setMessageType("error");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const db = await import("../lib/db");
      await db.addCardToFirestore({ provider, value, pointsRequired, code: code.trim() || null, serial: serial.trim() || null, used: false });
      setMessage("✅ Đã thêm thẻ thành công!");
      setMessageType("success");
      setCode("");
      setSerial("");
      await loadLists();
    } catch (err) {
      setMessage("❌ Lỗi khi thêm thẻ");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkAdd() {
    if (!bulkText.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const db = await import("../lib/db");
      const lines = bulkText.split("\n").filter(l => l.trim());
      let added = 0, failed = 0;
      for (const line of lines) {
        try {
          const parts = line.split(",").map(p => p.trim());
          if (parts[0]) {
            await db.addCardToFirestore({ provider, value, pointsRequired, code: parts[0], serial: parts[1] || null, used: false });
            added++;
          }
        } catch { failed++; }
      }
      setMessage(`✅ Đã thêm ${added} thẻ${failed > 0 ? `, ${failed} thẻ lỗi` : ""}`);
      setMessageType("success");
      setBulkText("");
      await loadLists();
    } catch { setMessage("❌ Lỗi khi thêm thẻ hàng loạt"); setMessageType("error"); }
    finally { setLoading(false); }
  }

  async function loadLists() {
    try {
      const db = await import("../lib/db");
      const c = await db.fetchCards();
      const r = await db.fetchRedeems(200);
      setCards(c);
      setRedeems(r);
      const userIds = Array.from(new Set(r.map((rr: any) => rr.userId).filter(Boolean)));
      const map: Record<string, any> = {};
      await Promise.all(userIds.map(async (uid: string) => {
        try { const u = await db.getUserByUid(uid); if (u) map[uid] = u; } catch { /* ignore */ }
      }));
      setUsersMap(map);
    } catch (err) { console.error("loadLists error", err); }
  }

  async function loadPointsData() {
    setLoadingPoints(true);
    try {
      const db = await import("../lib/db");
      const growth = await db.getDailyPointsGrowth();
      const teams = await db.getTeamsWithGrowth();
      setDailyGrowth(growth);
      setTeamsWithGrowth(teams);
    } catch (err) { console.error("loadPointsData error", err); }
    finally { setLoadingPoints(false); }
  }

  async function saveSnapshot() {
    setSavingSnapshot(true);
    setSnapshotProgress(null);
    setMessage(null);

    try {
      const response = await fetch('/api/snapshot-stream', { method: 'POST' });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace('data: ', ''));

            if (data.type === 'start') {
              setSnapshotProgress({ current: 0, total: data.total, percent: 0 });
            } else if (data.type === 'progress') {
              setSnapshotProgress({ current: data.current, total: data.total, percent: data.percent });
            } else if (data.type === 'complete') {
              setMessage(`✅ Đã lưu snapshot cho ${data.usersCount} người dùng (${data.date})`);
              setMessageType("success");
              setSnapshotProgress(null);
              await loadPointsData(); // Reload data sau khi lưu
            } else if (data.type === 'error') {
              setMessage(`❌ Lỗi: ${data.message}`);
              setMessageType("error");
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (err: any) {
      setMessage(`❌ Lỗi khi lưu snapshot: ${err?.message || 'Unknown'}`);
      setMessageType("error");
    } finally {
      setSavingSnapshot(false);
      setSnapshotProgress(null);
    }
  }

  useEffect(() => {
    if (authorized) { loadLists(); loadPointsData(); }
  }, [authorized]);

  const availableCards = cards?.filter(c => !c.used).length || 0;
  const usedCards = cards?.filter(c => c.used).length || 0;
  const totalRedeems = redeems?.length || 0;
  const totalGrowthToday = dailyGrowth.reduce((sum, u) => sum + (u.growth > 0 ? u.growth : 0), 0);
  const topGrowthTeam = teamsWithGrowth[0];

  if (!authorized) {
    return (
      <div className="admin-login-card">
        <div className="admin-login-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="#22c55e" strokeWidth="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2>Quản trị viên</h2>
        <p>Nhập mật khẩu để truy cập trang quản lý</p>
        <form onSubmit={checkPassword} className="admin-login-form">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" className="admin-input" />
          <button className="admin-btn-primary" type="submit">Mở khóa</button>
          {message && <div className={`admin-message ${messageType}`}>{message}</div>}
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>🎫 Quản lý thẻ cào</h1>
        <div className="admin-stats">
          <div className="stat-item"><span className="stat-value">{availableCards}</span><span className="stat-label">Thẻ còn lại</span></div>
          <div className="stat-item"><span className="stat-value">{usedCards}</span><span className="stat-label">Đã đổi</span></div>
          <div className="stat-item"><span className="stat-value">+{totalGrowthToday}</span><span className="stat-label">Điểm hôm nay</span></div>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === "add" ? "active" : ""}`} onClick={() => setActiveTab("add")}>➕ Thêm thẻ</button>
        <button className={`admin-tab ${activeTab === "cards" ? "active" : ""}`} onClick={() => setActiveTab("cards")}>📦 Kho thẻ ({availableCards})</button>
        <button className={`admin-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>📜 Lịch sử ({totalRedeems})</button>
        <button className={`admin-tab ${activeTab === "points" ? "active" : ""}`} onClick={() => setActiveTab("points")}>📊 Điểm xanh</button>
      </div>

      {/* Tab: Thêm thẻ */}
      {activeTab === "add" && (
        <div className="admin-card">
          <div className="card-header">
            <h3>Thêm thẻ mới</h3>
            <div className="toggle-mode">
              <button className={!bulkMode ? "active" : ""} onClick={() => setBulkMode(false)}>Từng thẻ</button>
              <button className={bulkMode ? "active" : ""} onClick={() => setBulkMode(true)}>Hàng loạt</button>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Nhà mạng</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="admin-select">
                <option>Viettel</option><option>Vinaphone</option><option>Mobifone</option><option>Garena</option>
              </select>
            </div>
            <div className="form-group">
              <label>Mệnh giá (VNĐ)</label>
              <select value={value} onChange={(e) => setValue(Number(e.target.value))} className="admin-select">
                <option value={10000}>10,000₫</option><option value={20000}>20,000₫</option><option value={30000}>30,000₫</option>
                <option value={50000}>50,000₫</option><option value={100000}>100,000₫</option><option value={200000}>200,000₫</option>
              </select>
            </div>
            <div className="form-group">
              <label>Điểm yêu cầu</label>
              <input type="number" value={pointsRequired} onChange={(e) => setPointsRequired(Number(e.target.value))} className="admin-input" />
            </div>
          </div>
          {!bulkMode ? (
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group flex-1"><label>Mã thẻ</label><input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="admin-input" placeholder="CODE" /></div>
                <div className="form-group flex-1"><label>Serial</label><input type="text" value={serial} onChange={(e) => setSerial(e.target.value)} className="admin-input" placeholder="Serial" /></div>
              </div>
              <button className="admin-btn-primary" type="submit" disabled={loading}>{loading ? "Đang thêm..." : "➕ Thêm thẻ"}</button>
            </form>
          ) : (
            <div>
              <div className="form-group"><label>Nhiều thẻ (CODE hoặc CODE,SERIAL mỗi dòng)</label><textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="admin-textarea" rows={6} /></div>
              <button className="admin-btn-primary" onClick={handleBulkAdd} disabled={loading}>{loading ? "..." : `➕ Thêm ${bulkText.split("\n").filter(l => l.trim()).length} thẻ`}</button>
            </div>
          )}
          {message && <div className={`admin-message ${messageType}`}>{message}</div>}
        </div>
      )}

      {/* Tab: Kho thẻ */}
      {activeTab === "cards" && (
        <div className="admin-card">
          <div className="card-header"><h3>Kho thẻ ({cards?.length || 0})</h3><button className="admin-btn-secondary" onClick={loadLists}>🔄 Làm mới</button></div>
          {!cards ? <div className="loading">Đang tải...</div> : cards.length === 0 ? <div className="empty-state">Chưa có thẻ nào</div> : (
            <div className="cards-list">
              {cards.map(c => (
                <div key={c.id} className={`card-item ${c.used ? "used" : "available"}`}>
                  <div className="card-info"><div className="card-provider">{c.provider}</div><div className="card-value">{c.value?.toLocaleString()}₫</div><div className="card-code">{c.code || "(no code)"}</div></div>
                  <div className="card-meta"><div className="card-points">{c.pointsRequired || 0}đ</div><div className={`card-status ${c.used ? "used" : "available"}`}>{c.used ? "Đã đổi" : "Còn sẵn"}</div></div>
                  <button className="admin-btn-danger" onClick={async () => { if (!confirm('Xóa?')) return; const db = await import('../lib/db'); await db.deleteCard(c.id); await loadLists(); }}>🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Lịch sử */}
      {activeTab === "history" && (
        <div className="admin-card">
          <div className="card-header">
            <h3>Lịch sử đổi thẻ</h3>
            <button className="admin-btn-secondary" onClick={() => {
              if (!redeems) return;
              const rows = [['Thời gian', 'Nhà mạng', 'Mệnh giá', 'Người dùng', 'Mã thẻ', 'Serial']];
              for (const r of redeems) {
                const time = r.createdAt ? new Date(r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt).toISOString() : '';
                rows.push([time, r.provider || '', r.value || '', usersMap[r.userId]?.displayName || r.userId || '', r.code || '', r.serial || '']);
              }
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `redeems_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
            }}>📥 Export CSV</button>
          </div>
          {!redeems ? <div className="loading">Đang tải...</div> : redeems.length === 0 ? <div className="empty-state">Chưa có lịch sử</div> : (
            <div className="history-list">
              {redeems.map(r => (
                <div key={r.id} className="history-item">
                  <div className="history-info"><div className="history-provider">{r.provider} - {r.value?.toLocaleString()}₫</div><div className="history-code">{r.code} {r.serial ? `• ${r.serial}` : ""}</div></div>
                  <div className="history-meta"><div className="history-user">{usersMap[r.userId]?.displayName || r.userId || "—"}</div><div className="history-time">{r.createdAt ? new Date(r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt).toLocaleString() : ""}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Điểm xanh */}
      {activeTab === "points" && (
        <div className="admin-card">
          <div className="card-header">
            <h3>📊 Quản lý Điểm xanh</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="admin-btn-secondary" onClick={loadPointsData} disabled={loadingPoints}>🔄 Làm mới</button>
              <button className="admin-btn-primary" onClick={saveSnapshot} disabled={savingSnapshot}>
                {savingSnapshot ? "⏳ Đang lưu..." : "📸 Lưu Snapshot"}
              </button>
            </div>
          </div>

          {/* Progress bar khi lưu snapshot */}
          {savingSnapshot && snapshotProgress && (
            <div className="snapshot-progress">
              <div className="progress-info">
                <span>Đang lưu: {snapshotProgress.current}/{snapshotProgress.total} người dùng</span>
                <span>{snapshotProgress.percent}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${snapshotProgress.percent}%` }}></div>
              </div>
            </div>
          )}

          {message && <div className={`admin-message ${messageType}`}>{message}</div>}

          {loadingPoints ? <div className="loading">Đang tải...</div> : (
            <>
              {/* Thống kê tổng quan */}
              <div className="points-summary">
                <div className="summary-card">
                  <div className="summary-value">+{totalGrowthToday}</div>
                  <div className="summary-label">Tổng điểm tăng hôm nay</div>
                </div>
                <div className="summary-card highlight">
                  <div className="summary-value">{topGrowthTeam?.name || "—"}</div>
                  <div className="summary-label">Đội tăng nhiều nhất (+{topGrowthTeam?.growth || 0})</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{teamsWithGrowth.length}</div>
                  <div className="summary-label">Số đội nhóm</div>
                </div>
              </div>

              {/* Top người tăng điểm */}
              <div className="points-section">
                <h4>🔥 Top 10 người tăng điểm hôm nay</h4>
                <div className="points-list">
                  {dailyGrowth.filter(u => u.growth > 0).slice(0, 10).map((u, idx) => (
                    <div key={u.uid} className="points-row">
                      <div className="points-rank">{idx + 1}</div>
                      <div className="points-avatar"><img src={u.avatar} alt={u.name} onError={(e: any) => e.currentTarget.src = "/images/user.png"} /></div>
                      <div className="points-info">
                        <div className="points-name">{u.name}</div>
                        <div className="points-team">{u.team || "Không có đội"}</div>
                      </div>
                      <div className="points-growth positive">+{u.growth}</div>
                    </div>
                  ))}
                  {dailyGrowth.filter(u => u.growth > 0).length === 0 && <div className="empty-state">Chưa có ai tăng điểm hôm nay</div>}
                </div>
              </div>

              {/* Danh sách đội nhóm */}
              <div className="points-section">
                <h4>👥 Đội nhóm (điểm tăng hôm nay)</h4>
                <div className="teams-grid">
                  {teamsWithGrowth.map((team, idx) => (
                    <div key={team.name} className={`team-card ${selectedTeam?.name === team.name ? "selected" : ""}`} onClick={() => setSelectedTeam(selectedTeam?.name === team.name ? null : team)}>
                      <div className="team-rank">{idx + 1}</div>
                      <div className="team-info">
                        <div className="team-name">{team.name}</div>
                        <div className="team-members">{team.members.length} thành viên</div>
                      </div>
                      <div className="team-stats">
                        <div className="team-growth positive">+{team.growth}</div>
                        <div className="team-total">{team.totalPoints}đ tổng</div>
                      </div>
                    </div>
                  ))}
                  {teamsWithGrowth.length === 0 && <div className="empty-state">Chưa có đội nhóm</div>}
                </div>
              </div>

              {/* Chi tiết thành viên đội */}
              {selectedTeam && (
                <div className="points-section">
                  <h4>👤 Thành viên đội: {selectedTeam.name}</h4>
                  <div className="members-list">
                    {selectedTeam.members.map((m: any, idx: number) => (
                      <div key={m.uid} className={`member-row ${m.growth > 0 ? "active" : m.growth === 0 ? "inactive" : ""}`}>
                        <div className="member-rank">{idx + 1}</div>
                        <div className="member-avatar"><img src={m.avatar} alt={m.name} onError={(e: any) => e.currentTarget.src = "/images/user.png"} /></div>
                        <div className="member-info">
                          <div className="member-name">{m.name}</div>
                          <div className="member-points">{m.currentPoints}đ tổng</div>
                        </div>
                        <div className={`member-growth ${m.growth > 0 ? "positive" : m.growth < 0 ? "negative" : "zero"}`}>
                          {m.growth > 0 ? `+${m.growth}` : m.growth}
                          {m.growth === 0 && <span className="inactive-badge">⚠️ Chưa hoạt động</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="team-legend">
                    <span className="legend-item active">🟢 Đang dùng app</span>
                    <span className="legend-item inactive">🔴 Chưa hoạt động hôm nay</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
