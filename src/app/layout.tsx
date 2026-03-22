import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AISidebarProvider } from "@/components/AISidebarContext";
import { ImageLightbox } from "@/components/ImageLightbox";

export const metadata: Metadata = {
  title: "DeepRoot-个人树状知识库",
  description: "从问题出发，递归到知识的根部。支持划选提问、知识树可视化、AI 对话。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="flex h-screen overflow-hidden bg-bg">
        <AISidebarProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
          <ImageLightbox />
        </AISidebarProvider>
      </body>
    </html>
  );
}
