"use client";
import { useEffect, useState } from "react";
import RedeemCard2 from "./RedeemCard2";

export default function Storefront() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const db = await import("../lib/db");
        const g = await db.fetchAvailableCardGroups();
        if (!mounted) return;
        setGroups(g);
      } catch (err) {
        console.error("Error loading storefront groups", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="card">Đang tải cửa hàng...</div>;
  }

  if (!groups.length) {
    return <div className="card">Chưa có thẻ sẵn sàng để đổi. Vui lòng quay lại sau.</div>;
  }

  return (
    <div className="mt-6 shop-grid">
      {groups.map((g) => (
        <RedeemCard2
          key={`${g.provider}-${g.value}`}
          provider={g.provider}
          value={g.value}
          pointsRequired={g.pointsRequired || 0}
          availableCount={g.count}
        />
      ))}
    </div>
  );
}


