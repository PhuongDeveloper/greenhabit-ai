"use client";

const getDownloadUrl = () => {
  if (typeof window === 'undefined') return '#';

  const userAgent = navigator.userAgent || navigator.vendor;

  // Check if iOS
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'https://apps.apple.com/vn/app/greenhabit-ai/id6757384637?l=vi';
  }

  // Default to Android (including all other platforms)
  return 'https://play.google.com/store/apps/details?id=com.phuongdev.greenhabit';
};

export default function AppIntro() {
  const handleDownload = () => {
    window.location.href = getDownloadUrl();
  };

  return (
    <section className="hero-event" aria-labelledby="hero-heading">
      <div className="hero-event-inner">
        {/* Robot cầm quà bên trái */}
        <div className="hero-robot" aria-hidden>
          <img
            src="/images/chatbot_1.png"
            alt="robot"
            onError={(e: any) => { e.currentTarget.src = '/images/logo.png'; }}
          />
        </div>

        {/* Text bên phải */}
        <div className="hero-text">
          <h1 id="hero-heading">
            Tham gia ngay,<br />
            nhận quà liền tay!
          </h1>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="download-app-btn"
            aria-label="Tải xuống ứng dụng GreenHabit AI"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v13m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Tải xuống ngay</span>
          </button>
        </div>
      </div>
    </section>
  );
}
