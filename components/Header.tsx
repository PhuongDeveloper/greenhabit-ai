"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChangedListener, signOut } from "../lib/auth";
import { getUserByUid } from "../lib/db";
import LoginModal from "./LoginModal";

export default function Header() {
  const [user, setUser] = useState<any | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChangedListener(async (authUser) => {
      if (!authUser) {
        setUser(null);
        return;
      }
      const profile = await getUserByUid(authUser.uid);
      setUser(profile);
    });
    return () => unsub();
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
    } catch (err) {
      console.error("Sign out failed", err);
    }
  }

  return (
    <header className="topbar-event" role="banner">
      <div className="topbar-event-inner">
        {/* Logo bên trái */}
        <Link href="/" className="topbar-brand" aria-label="GreenHabit AI">
          <img
            src="/images/logo.png"
            alt="GreenHabit AI"
            className="topbar-logo"
            onError={(e) => {
              // @ts-ignore
              e.currentTarget.src = "/images/logo.svg";
            }}
          />
          <span className="topbar-brand-text">GreenHabit AI</span>
        </Link>

        {/* Title giữa */}
        <div className="topbar-title">Lễ Hội Sống Xanh</div>

        {/* Nút đăng nhập bên phải */}
        <nav className="topbar-right-actions">
          {user ? (
            <>
              <div className="user-points-badge">
                <span>{user.greenPoints ?? 0}đ</span>
              </div>
              <button className="btn-logout" onClick={handleSignOut} aria-label="Đăng xuất">
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <button className="btn-login-orange" onClick={() => setShowLogin(true)} aria-label="Đăng nhập">
                Đăng nhập
              </button>
              <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
