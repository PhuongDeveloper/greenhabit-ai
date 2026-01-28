"use client";
import { useEffect, useState } from "react";
import { getDailyPointsGrowth } from "../lib/db";

type GrowthUser = {
    uid: string;
    name: string;
    avatar: string;
    growth: number;
    currentPoints: number;
};

export default function TopGrowth() {
    const [topGrowth, setTopGrowth] = useState<GrowthUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const growth = await getDailyPointsGrowth();
                if (!mounted) return;

                // Lấy top 5 người tăng nhiều nhất (chỉ lấy người có growth > 0)
                const top = growth
                    .filter(g => g.growth > 0)
                    .slice(0, 5);

                setTopGrowth(top);
            } catch (err) {
                console.error("Load growth error:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => { mounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="top-growth-container">
                <h3 className="section-title-sm">🔥 Top tăng điểm hôm nay</h3>
                <div className="top-growth-list">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="growth-item skeleton">
                            <div className="skeleton-avatar-sm"></div>
                            <div style={{ flex: 1 }}>
                                <div className="skeleton-text" style={{ width: '60%', height: 12 }}></div>
                            </div>
                            <div className="skeleton-text" style={{ width: 40, height: 14 }}></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (topGrowth.length === 0) {
        return (
            <div className="top-growth-container">
                <h3 className="section-title-sm">🔥 Top tăng điểm hôm nay</h3>
                <p className="empty-text">Chưa có dữ liệu điểm tăng hôm nay</p>
            </div>
        );
    }

    return (
        <div className="top-growth-container">
            <h3 className="section-title-sm">🔥 Top tăng điểm hôm nay</h3>
            <div className="top-growth-list">
                {topGrowth.map((u, idx) => (
                    <div key={u.uid} className="growth-item">
                        <div className={`growth-rank rank-${idx + 1}`}>{idx + 1}</div>
                        <div className="growth-avatar">
                            <img
                                src={u.avatar}
                                alt={u.name}
                                onError={(e: any) => e.currentTarget.src = "/images/user.png"}
                            />
                        </div>
                        <div className="growth-info">
                            <div className="growth-name">{u.name}</div>
                            <div className="growth-current">{u.currentPoints}đ tổng</div>
                        </div>
                        <div className="growth-value">
                            <span className="growth-arrow">↑</span>
                            +{u.growth}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
