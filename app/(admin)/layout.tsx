import { Sidebar } from "@/components/shared/Sidebar";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        {/* overflow-hidden: cada página controla seu próprio scroll interno */}
        <main className="flex-1 min-w-0 overflow-hidden h-full">{children}</main>
      </div>
    </ThemeProvider>
  );
}