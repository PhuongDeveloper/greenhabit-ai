"use client";

export default function AppIntro() {
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
        </div>
      </div>
    </section>
  );
}
