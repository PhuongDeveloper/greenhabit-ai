import "./globals.css";
import { ReactNode } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata = {
  title: "GreenHabit AI — Lễ Hội Sống Xanh",
  description: "GreenHabit AI event site — đổi điểm xanh lấy thẻ cào"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="event-body">
        <Header />
        <main className="event-main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
