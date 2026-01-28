"use client";
import { useEffect, useState } from "react";
import AppIntro from "../components/AppIntro";
import Storefront from "../components/Storefront";
import Leaderboard from "../components/Leaderboard";
import HistoryList from "../components/HistoryList";
import TopGrowth from "../components/TopGrowth";
import { onAuthStateChangedListener, getCurrentUserProfile } from "../lib/auth";

export default function Page() {
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChangedListener(async (authUser) => {
      if (!authUser) {
        setUserPoints(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getCurrentUserProfile();
        setUserPoints(profile?.greenPoints ?? 0);
      } catch (e) {
        setUserPoints(0);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <div className="event-page">
      <div className="event-container">
        {/* Hero / Banner */}
        <AppIntro />

        {/* Cửa hàng Quy đổi */}
        <section className="section-card">
          <div className="section-header">
            <h2 className="section-title">Cửa hàng Quy đổi</h2>
            <div className="user-points">
              <span className="points-label">Điểm của bạn:</span>
              <span className="points-value">
                {loading ? "..." : (userPoints !== null ? userPoints : "—")}
              </span>
            </div>
          </div>
          <div className="storefront-grid">
            <Storefront />
          </div>
        </section>

        {/* Lịch sử Quy đổi */}
        <section className="section-card">
          <h3 className="section-title-sm">Lịch sử Quy đổi</h3>
          <HistoryList />
        </section>

        {/* Top tăng điểm hôm nay */}
        <section className="section-card">
          <TopGrowth />
        </section>

        {/* Bảng Xếp hạng */}
        <section className="section-card">
          <Leaderboard />
        </section>
      </div>
    </div>
  );
}
