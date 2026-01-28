"use client";
import { useState } from "react";

export default function MergeAccountsPage() {
    const [password, setPassword] = useState("");
    const [authorized, setAuthorized] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);
    const [duplicates, setDuplicates] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
    const [merging, setMerging] = useState(false);
    const [mergeProgress, setMergeProgress] = useState<string | null>(null);

    function checkPassword(e: React.FormEvent) {
        e.preventDefault();
        if (password === "050128") {
            setAuthorized(true);
            loadData();
        } else {
            setMessage("Mật khẩu sai");
            setMessageType("error");
        }
    }

    async function loadData() {
        setLoading(true);
        try {
            const res = await fetch('/api/merge-accounts');
            const data = await res.json();
            setMatches(data.matches || []);
            setDuplicates(data.duplicates || []);
            setStats({
                totalUsers: data.totalUsers,
                zeroPointAccounts: data.zeroPointAccounts,
                sourceAccounts: data.sourceAccounts,
                matchesFound: data.matchesFound,
                duplicateEmails: data.duplicateEmails
            });
            setMessage(`Tìm thấy ${data.matchesFound} cặp account cần merge`);
            setMessageType("info");
        } catch (err) {
            setMessage("Lỗi khi tải dữ liệu");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    async function mergeOne(newUid: string, oldUid: string, email: string) {
        try {
            const res = await fetch('/api/merge-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'merge_uid', newUid, oldUid })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`✅ Đã merge: ${email} (${data.mergedData?.greenPoints || 0} điểm)`);
                setMessageType("success");
                await loadData();
            } else {
                setMessage(`❌ Lỗi: ${data.error}`);
                setMessageType("error");
            }
        } catch (err) {
            setMessage("❌ Lỗi khi merge");
            setMessageType("error");
        }
    }

    async function mergeAll() {
        if (!matches.length) return;

        const confirmed = confirm(`Bạn sắp merge ${matches.length} cặp accounts.\n\n⚠️ Hành động này không thể hoàn tác!\n\nTiếp tục?`);
        if (!confirmed) return;

        setMerging(true);
        setMergeProgress(`Đang merge 0/${matches.length}...`);

        try {
            // Prepare merge list: zeroAccount (điểm 0) gets data from sourceAccount (điểm > 0)
            const mergeList = matches.map(m => ({
                newUid: m.zeroAccount.uid,  // Account mới đăng nhập (điểm 0)
                oldUid: m.sourceAccount.uid, // Account ảo cũ (có điểm)
                email: m.zeroAccount.email || m.sourceAccount.email || m.zeroAccount.displayName
            }));

            const res = await fetch('/api/merge-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'merge_all', mergeList })
            });

            const data = await res.json();

            if (data.success) {
                setMessage(`✅ Đã merge ${data.successCount}/${matches.length} accounts${data.errorCount > 0 ? `, ${data.errorCount} lỗi` : ''}`);
                setMessageType("success");
                await loadData();
            } else {
                setMessage(`❌ Lỗi: ${data.error}`);
                setMessageType("error");
            }
        } catch (err) {
            setMessage("❌ Lỗi khi merge");
            setMessageType("error");
        } finally {
            setMerging(false);
            setMergeProgress(null);
        }
    }

    if (!authorized) {
        return (
            <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center', padding: 20 }}>
                <h2>🔗 Merge Accounts</h2>
                <p style={{ color: '#666' }}>Nhập mật khẩu admin</p>
                <form onSubmit={checkPassword}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu"
                        style={{ padding: '12px', width: '100%', marginBottom: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <button type="submit" style={{ padding: '12px 24px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', width: '100%' }}>
                        Mở khóa
                    </button>
                </form>
                {message && <p style={{ color: messageType === 'error' ? '#dc2626' : '#16a34a', marginTop: 12 }}>{message}</p>}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1000, margin: '40px auto', padding: 20 }}>
            <h1 style={{ marginBottom: 8 }}>🔗 Merge Accounts Tool</h1>
            <p style={{ color: '#666', marginBottom: 24 }}>
                Quét accounts có <strong>điểm = 0</strong> (vừa đăng nhập) và tìm match với accounts có <strong>điểm &gt; 0</strong> (account ảo) theo email hoặc tên.
            </p>

            {/* Stats */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{stats.totalUsers}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Tổng users</div>
                    </div>
                    <div style={{ background: '#fef3c7', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{stats.zeroPointAccounts}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Điểm = 0</div>
                    </div>
                    <div style={{ background: '#dbeafe', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>{stats.sourceAccounts}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Điểm &gt; 0</div>
                    </div>
                    <div style={{ background: '#fce7f3', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#db2777' }}>{stats.matchesFound}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Cần merge</div>
                    </div>
                </div>
            )}

            {message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 20,
                    background: messageType === 'error' ? '#fef2f2' : messageType === 'success' ? '#f0fdf4' : '#eff6ff',
                    color: messageType === 'error' ? '#dc2626' : messageType === 'success' ? '#16a34a' : '#2563eb'
                }}>
                    {message}
                </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <button onClick={loadData} disabled={loading} style={{ padding: '12px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' }}>
                    {loading ? "⏳ Đang tải..." : "🔄 Làm mới"}
                </button>
                <button
                    onClick={mergeAll}
                    disabled={merging || matches.length === 0}
                    style={{
                        padding: '12px 24px',
                        cursor: matches.length === 0 ? 'not-allowed' : 'pointer',
                        borderRadius: 8,
                        border: 'none',
                        background: matches.length === 0 ? '#9ca3af' : '#dc2626',
                        color: 'white',
                        fontWeight: 600
                    }}
                >
                    {merging ? mergeProgress || "⏳ Đang merge..." : `🚀 Merge tất cả (${matches.length})`}
                </button>
            </div>

            {/* Matches list */}
            <div style={{ marginBottom: 40 }}>
                <h3 style={{ marginBottom: 16 }}>🎯 Accounts cần merge ({matches.length})</h3>

                {matches.length === 0 && !loading && (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>Không tìm thấy accounts cần merge</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {matches.map((m, idx) => (
                        <div key={idx} style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16
                        }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: m.matchType === 'email' ? '#dcfce7' : '#dbeafe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                color: m.matchType === 'email' ? '#16a34a' : '#2563eb'
                            }}>
                                {m.matchScore}%
                            </div>

                            {/* Zero account (target) */}
                            <div style={{ flex: 1, background: '#fef3c7', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 11, color: '#92400e', marginBottom: 4 }}>🆕 ĐĂNG NHẬP MỚI (điểm 0)</div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.zeroAccount.displayName || '(Không tên)'}</div>
                                <div style={{ fontSize: 12, color: '#666' }}>{m.zeroAccount.email}</div>
                                <div style={{ fontSize: 11, color: '#999' }}>UID: {m.zeroAccount.uid?.substring(0, 12)}...</div>
                            </div>

                            <div style={{ fontSize: 24, color: '#9ca3af' }}>→</div>

                            {/* Source account (with points) */}
                            <div style={{ flex: 1, background: '#dcfce7', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 11, color: '#166534', marginBottom: 4 }}>💎 ACCOUNT ẢO ({m.sourceAccount.greenPoints} điểm)</div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.sourceAccount.displayName || '(Không tên)'}</div>
                                <div style={{ fontSize: 12, color: '#666' }}>{m.sourceAccount.email}</div>
                                <div style={{ fontSize: 11, color: '#999' }}>UID: {m.sourceAccount.uid?.substring(0, 12)}...</div>
                            </div>

                            <div style={{
                                padding: '4px 8px',
                                borderRadius: 4,
                                background: m.matchType === 'email' ? '#dcfce7' : '#dbeafe',
                                fontSize: 11,
                                color: m.matchType === 'email' ? '#166534' : '#1e40af'
                            }}>
                                {m.matchType === 'email' ? '📧 Email' : m.matchType === 'name_exact' ? '👤 Tên' : '🔍 Tương tự'}
                            </div>

                            <button
                                onClick={() => mergeOne(m.zeroAccount.uid, m.sourceAccount.uid, m.zeroAccount.email || m.zeroAccount.displayName)}
                                style={{
                                    padding: '8px 16px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 12
                                }}
                            >
                                Merge
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Duplicate emails (legacy view) */}
            {duplicates.length > 0 && (
                <div>
                    <h3 style={{ marginBottom: 16, color: '#666' }}>📧 Email trùng ({duplicates.length})</h3>
                    <div style={{ fontSize: 12, color: '#999' }}>
                        Các email có nhiều hơn 1 account (có thể đã được xử lý ở trên)
                    </div>
                </div>
            )}
        </div>
    );
}
