import { HubNavbar } from "@/components/hub/HubNavbar";
import { Toaster } from "@/components/ui/toaster";

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      <HubNavbar />
      {children}
      <Toaster />
    </div>
  );
}
