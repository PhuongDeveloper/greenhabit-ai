"use client";
import { useState, useEffect } from "react";

interface MergedUser {
    currentUid: string;
    originalUid: string;
    email: string;
    displayName: string;
    greenPoints: number;
    mergedAt: string;
    hasFarm: boolean;
    hasTreesProgress: boolean;
    hasAchievements: boolean;
    hasOldSnapshots: boolean;
    hasOldFarm: boolean;
    hasOldAchievements: boolean;
    oldFarmTrees: number;
}

export default function RestoreDataPage() {
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState<string | null>(null);
    const [data, setData] = useState<{
        totalMergedUsers: number;
        recoveryInfo: MergedUser[];
        summary: any;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [restoreResults, setRestoreResults] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/restore-data");
            const json = await res.json();
            if (json.error) {
                setError(json.error);
            } else {
                setData(json);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreUser = async (userId: string) => {
        if (!confirm(`Bạn có chắc muốn khôi phục data cho user ${userId}?`)) return;

        setRestoring(userId);
        try {
            const res = await fetch("/api/restore-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "restore_user", userId })
            });
            const json = await res.json();
            setRestoreResults(prev => ({ ...prev, [userId]: json }));

            if (json.success) {
                alert(`Khôi phục thành công: ${json.message}`);
            } else {
                alert(`Lỗi: ${json.error || json.message}`);
            }
        } catch (err: any) {
            alert(`Lỗi: ${err.message}`);
        } finally {
            setRestoring(null);
        }
    };

    const handleRestoreAll = async () => {
        if (!confirm(`Bạn có chắc muốn khôi phục data cho TẤT CẢ ${data?.totalMergedUsers} users đã merge?\n\nHành động này sẽ mất một lúc.`)) return;

        setRestoring("all");
        try {
            const res = await fetch("/api/restore-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "restore_all" })
            });
            const json = await res.json();

            if (json.success) {
                alert(`Khôi phục hoàn tất!\n${json.message}`);
                fetchData(); // Refresh
            } else {
                alert(`Lỗi: ${json.error || json.message}`);
            }
        } catch (err: any) {
            alert(`Lỗi: ${err.message}`);
        } finally {
            setRestoring(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Lỗi:</strong> {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        🔧 Khôi phục Data sau Merge Accounts
                    </h1>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <h3 className="font-bold text-yellow-800 mb-2">⚠️ Vấn đề đã xảy ra</h3>
                        <p className="text-yellow-700 text-sm">
                            Khi merge accounts, một số data (farm, cây, achievements) có thể bị ghi đè.
                            Công cụ này sẽ tìm và khôi phục data từ account gốc (originalUid).
                        </p>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-3xl font-bold text-blue-600">{data?.totalMergedUsers}</div>
                            <div className="text-sm text-blue-800">Users đã merge</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-3xl font-bold text-green-600">{data?.summary?.usersWithOldFarm}</div>
                            <div className="text-sm text-green-800">Có Farm cũ</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="text-3xl font-bold text-purple-600">{data?.summary?.usersWithOldAchievements}</div>
                            <div className="text-sm text-purple-800">Có Achievements cũ</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="text-3xl font-bold text-orange-600">{data?.summary?.usersWithOldSnapshots}</div>
                            <div className="text-sm text-orange-800">Có Snapshots cũ</div>
                        </div>
                    </div>

                    {/* Restore All Button */}
                    <button
                        onClick={handleRestoreAll}
                        disabled={restoring === "all" || !data?.totalMergedUsers}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
                    >
                        {restoring === "all" ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Đang khôi phục...
                            </span>
                        ) : (
                            `🔄 Khôi phục TẤT CẢ ${data?.totalMergedUsers} users`
                        )}
                    </button>
                </div>

                {/* User List */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                        Danh sách Users đã Merge
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Email/Tên</th>
                                    <th className="px-4 py-3 text-left">Điểm</th>
                                    <th className="px-4 py-3 text-left">Data còn lại</th>
                                    <th className="px-4 py-3 text-left">Data gốc</th>
                                    <th className="px-4 py-3 text-left">Merged</th>
                                    <th className="px-4 py-3 text-left">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {data?.recoveryInfo.map((user) => (
                                    <tr key={user.currentUid} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{user.displayName}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-bold text-green-600">{user.greenPoints}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {user.hasFarm && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Farm</span>}
                                                {user.hasAchievements && <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Ach</span>}
                                                {!user.hasFarm && !user.hasAchievements && <span className="text-gray-400">Trống</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {user.hasOldFarm && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Farm ({user.oldFarmTrees} cây)</span>}
                                                {user.hasOldAchievements && <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Ach</span>}
                                                {!user.hasOldFarm && !user.hasOldAchievements && <span className="text-gray-400">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {user.mergedAt ? new Date(user.mergedAt).toLocaleDateString('vi-VN') : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {restoreResults[user.currentUid]?.success ? (
                                                <span className="text-green-600 text-sm">✅ Đã khôi phục</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleRestoreUser(user.currentUid)}
                                                    disabled={restoring === user.currentUid}
                                                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
                                                >
                                                    {restoring === user.currentUid ? '...' : 'Khôi phục'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {data?.recoveryInfo.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Không có user nào đã merge
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
