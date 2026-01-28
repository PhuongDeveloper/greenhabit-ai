"use client";
import { useEffect, useState } from "react";
import { onAuthStateChangedListener } from "../lib/auth";
import { getUserByUid } from "../lib/db";

export default function UserInfo() {
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChangedListener(async (authUser) => {
      if (!authUser) {
        setProfile(null);
        return;
      }
      const p = await getUserByUid(authUser.uid);
      setProfile(p);
    });
    return () => unsub();
  }, []);

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="status-strip" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img
            src={profile?.avatarUrl || "/images/user.png"}
            alt="avatar"
            className="avatar"
            onError={(e) => {
              e.currentTarget.src = "/images/user.svg";
            }}
          />
          <div className="flex-child" style={{ minWidth: 0 }}>
            <div className="user-name truncate">{profile?.displayName || profile?.email || "Người dùng"}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="small muted" style={{ textAlign: 'right' }}>Điểm hiện tại</div>
          <div className="points-pill" aria-label={`Điểm xanh: ${profile?.greenPoints ?? 0}`}>
            <span className="points-value">{profile?.greenPoints ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


