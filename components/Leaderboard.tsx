"use client";
import { useEffect, useState } from "react";
import { getDb } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

type Leader = { uid: string; name: string; avatar?: string; points: number };
type Team = { name: string; points: number; avatar?: string; memberCount?: number };

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState<Leader[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"personal" | "teams">("personal");
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllTeams, setShowAllTeams] = useState(false);

  // Load BOTH users AND teams ngay khi component mount
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      // Load users
      setLoadingUsers(true);
      try {
        const { getTopUsers } = await import("../lib/db");
        const users = await getTopUsers(10);

        if (!mounted) return;

        const mapped = users.map((u: any) => ({
          uid: u.uid ?? u.id,
          name: u.displayName ?? u.email ?? u.name ?? "Người dùng",
          avatar: u.avatarUrl || u.avatar || u.photoURL || "/images/user.png",
          points: u.greenPoints ?? 0,
        }));

        setTopUsers(mapped);
      } catch (err) {
        console.error("Load users error:", err);
      } finally {
        if (mounted) setLoadingUsers(false);
      }

      // Load teams ngay sau đó
      setLoadingTeams(true);
      try {
        const db = getDb();
        let teamsLoaded = false;

        // Thử load từ collection teams
        try {
          const teamsSnap = await getDocs(collection(db, "teams"));

          if (!teamsSnap.empty && mounted) {
            const teamDocs = teamsSnap.docs.map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                name: data.name || "Đội xanh",
                memberCount: data.memberCount || 0,
                avatarUrl: data.avatarUrl || "",
              };
            });

            const teamPointsArr: Team[] = [];
            for (const team of teamDocs) {
              try {
                const membersSnap = await getDocs(query(collection(db, "team_members"), where("teamId", "==", team.id)));
                const userIds = membersSnap.docs.map((m) => (m.data() as any).userId).filter(Boolean);
                let total = 0;
                const batchSize = 10;
                for (let i = 0; i < userIds.length; i += batchSize) {
                  const batch = userIds.slice(i, i + batchSize);
                  if (!batch.length) continue;
                  const usersSnap = await getDocs(query(collection(db, "users"), where("__name__", "in", batch)));
                  usersSnap.forEach((uSnap) => {
                    const data = uSnap.data() as any;
                    total += data.greenPoints || 0;
                  });
                }
                teamPointsArr.push({ name: team.name, points: total, avatar: team.avatarUrl, memberCount: team.memberCount });
              } catch (e) {
                // Skip team nếu lỗi
              }
            }
            const sortedTeams = teamPointsArr.sort((a, b) => b.points - a.points).slice(0, 10);
            setTeams(sortedTeams);
            teamsLoaded = sortedTeams.length > 0;
          }
        } catch (e) {
          console.log("No teams collection, trying aggregation");
        }

        // Nếu chưa load được teams, aggregate từ users
        if (!teamsLoaded && mounted) {
          const { getAllUsersForAggregation } = await import("../lib/db");
          const allUsers = await getAllUsersForAggregation();
          const teamMap: Record<string, number> = {};
          allUsers.forEach((u: any) => {
            const team = u.team ?? u.teamName ?? "";
            if (!team) return;
            const pts = u.greenPoints ?? 0;
            teamMap[team] = (teamMap[team] || 0) + pts;
          });
          const teamsArr = Object.entries(teamMap)
            .map(([name, points]) => ({ name, points }))
            .filter((t) => t.name && t.name !== "Không thuộc đội")
            .sort((a, b) => b.points - a.points)
            .slice(0, 10);
          setTeams(teamsArr);
        }
      } catch (err) {
        console.error("Load teams error:", err);
      } finally {
        if (mounted) setLoadingTeams(false);
      }
    }

    loadAll();
    return () => { mounted = false; };
  }, []);

  // Skeleton loading component
  const SkeletonPodium = () => (
    <div className="top3-podium">
      {[2, 1, 3].map((rank) => (
        <div key={rank} className={`podium-item rank-${rank}`}>
          <div className="podium-avatar skeleton-avatar"></div>
          <div className="skeleton-text" style={{ width: 60, height: 12, marginTop: 8 }}></div>
          <div className="skeleton-text" style={{ width: 40, height: 10, marginTop: 4 }}></div>
        </div>
      ))}
    </div>
  );

  const SkeletonList = () => (
    <div className="skeleton-list">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-avatar-sm"></div>
          <div style={{ flex: 1 }}>
            <div className="skeleton-text" style={{ width: '60%', height: 12 }}></div>
            <div className="skeleton-text" style={{ width: '40%', height: 10, marginTop: 4 }}></div>
          </div>
          <div className="skeleton-text" style={{ width: 50, height: 14 }}></div>
        </div>
      ))}
    </div>
  );

  const displayUsers = topUsers;
  const displayTeams = teams;

  const top1 = displayUsers[0] ?? null;
  const top2 = displayUsers[1] ?? null;
  const top3 = displayUsers[2] ?? null;

  const teamTop1 = displayTeams[0] ?? null;
  const teamTop2 = displayTeams[1] ?? null;
  const teamTop3 = displayTeams[2] ?? null;

  const usersToShow = showAllUsers ? displayUsers.slice(0, 10) : displayUsers.slice(0, 3);
  const teamsToShow = showAllTeams ? displayTeams.slice(0, 10) : displayTeams.slice(0, 3);

  return (
    <div className="leaderboard-v2">
      {/* Header với title */}
      <div className="leaderboard-header-v2">
        <h3 className="leaderboard-title">Bảng Xếp hạng</h3>
      </div>

      {/* Tab buttons */}
      <div className="leaderboard-tabs">
        <button
          className={`tab-btn-v2 ${selectedTab === "personal" ? "active" : ""}`}
          onClick={() => setSelectedTab("personal")}
        >
          Cá nhân
        </button>
        <button
          className={`tab-btn-v2 ${selectedTab === "teams" ? "active" : ""}`}
          onClick={() => setSelectedTab("teams")}
        >
          Đội nhóm {loadingTeams ? "" : `(${displayTeams.length})`}
        </button>
      </div>

      {/* Tab: Cá nhân */}
      {selectedTab === "personal" && (
        <>
          {loadingUsers ? (
            <>
              <SkeletonPodium />
              <SkeletonList />
            </>
          ) : displayUsers.length === 0 ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: "20px 0" }}>
              Chưa có dữ liệu xếp hạng
            </p>
          ) : (
            <>
              {!showAllUsers && (
                <div className="top3-podium">
                  <div className="podium-item rank-2">
                    <div className="podium-avatar">
                      {top2 && <img src={top2.avatar} alt={top2.name} onError={(e: any) => e.currentTarget.src = "/images/user.png"} />}
                      <div className="podium-medal medal-2">2</div>
                    </div>
                    <div className="podium-name">{top2?.name || "—"}</div>
                    <div className="podium-points">{top2?.points || 0}đ</div>
                  </div>

                  <div className="podium-item rank-1">
                    <div className="podium-avatar">
                      {top1 && <img src={top1.avatar} alt={top1.name} onError={(e: any) => e.currentTarget.src = "/images/user.png"} />}
                      <div className="podium-medal medal-1">1</div>
                    </div>
                    <div className="podium-name">{top1?.name || "—"}</div>
                    <div className="podium-points">{top1?.points || 0}đ</div>
                  </div>

                  <div className="podium-item rank-3">
                    <div className="podium-avatar">
                      {top3 && <img src={top3.avatar} alt={top3.name} onError={(e: any) => e.currentTarget.src = "/images/user.png"} />}
                      <div className="podium-medal medal-3">3</div>
                    </div>
                    <div className="podium-name">{top3?.name || "—"}</div>
                    <div className="podium-points">{top3?.points || 0}đ</div>
                  </div>
                </div>
              )}

              {showAllUsers && (
                <div className="leaderboard-list">
                  {usersToShow.map((u, idx) => (
                    <div key={u.uid} className={`leaderboard-row ${idx < 3 ? `rank-${idx + 1}-bg` : ""}`}>
                      <div className="leaderboard-rank">{idx + 1}</div>
                      <div className="leaderboard-avatar-sm">
                        <img src={u.avatar} alt={u.name} onError={(e: any) => e.currentTarget.src = "/images/user.png"} />
                      </div>
                      <div className="leaderboard-info">
                        <div className="leaderboard-name">{u.name}</div>
                      </div>
                      <div className="leaderboard-pts">{u.points}đ</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="leaderboard-see-all">
                {!showAllUsers ? (
                  <button className="see-all-link" onClick={() => setShowAllUsers(true)}>Xem tất cả</button>
                ) : (
                  <button className="see-all-link" onClick={() => setShowAllUsers(false)}>Thu gọn</button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Tab: Đội nhóm */}
      {selectedTab === "teams" && (
        <>
          {loadingTeams ? (
            <>
              <SkeletonPodium />
              <SkeletonList />
            </>
          ) : displayTeams.length === 0 ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: "20px 0" }}>
              Chưa có dữ liệu đội nhóm
            </p>
          ) : (
            <>
              {!showAllTeams && (
                <div className="top3-podium">
                  <div className="podium-item rank-2">
                    <div className="podium-avatar">
                      {teamTop2 && <img src={teamTop2.avatar || "/images/logo.png"} alt={teamTop2.name} onError={(e: any) => e.currentTarget.src = "/images/logo.png"} />}
                      <div className="podium-medal medal-2">2</div>
                    </div>
                    <div className="podium-name">{teamTop2?.name || "—"}</div>
                    <div className="podium-points">{teamTop2?.points || 0}đ</div>
                  </div>

                  <div className="podium-item rank-1">
                    <div className="podium-avatar">
                      {teamTop1 && <img src={teamTop1.avatar || "/images/logo.png"} alt={teamTop1.name} onError={(e: any) => e.currentTarget.src = "/images/logo.png"} />}
                      <div className="podium-medal medal-1">1</div>
                    </div>
                    <div className="podium-name">{teamTop1?.name || "—"}</div>
                    <div className="podium-points">{teamTop1?.points || 0}đ</div>
                  </div>

                  <div className="podium-item rank-3">
                    <div className="podium-avatar">
                      {teamTop3 && <img src={teamTop3.avatar || "/images/logo.png"} alt={teamTop3.name} onError={(e: any) => e.currentTarget.src = "/images/logo.png"} />}
                      <div className="podium-medal medal-3">3</div>
                    </div>
                    <div className="podium-name">{teamTop3?.name || "—"}</div>
                    <div className="podium-points">{teamTop3?.points || 0}đ</div>
                  </div>
                </div>
              )}

              {showAllTeams && (
                <div className="leaderboard-list">
                  {teamsToShow.map((t, idx) => (
                    <div key={t.name} className={`leaderboard-row ${idx < 3 ? `rank-${idx + 1}-bg` : ""}`}>
                      <div className="leaderboard-rank">{idx + 1}</div>
                      <div className="leaderboard-avatar-sm">
                        <img src={t.avatar || "/images/logo.png"} alt={t.name} onError={(e: any) => e.currentTarget.src = "/images/logo.png"} />
                      </div>
                      <div className="leaderboard-info">
                        <div className="leaderboard-name">{t.name}</div>
                        {t.memberCount && <div className="leaderboard-sub">{t.memberCount} thành viên</div>}
                      </div>
                      <div className="leaderboard-pts">{t.points}đ</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="leaderboard-see-all">
                {!showAllTeams ? (
                  <button className="see-all-link" onClick={() => setShowAllTeams(true)}>Xem tất cả</button>
                ) : (
                  <button className="see-all-link" onClick={() => setShowAllTeams(false)}>Thu gọn</button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
