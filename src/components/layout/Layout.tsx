import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Search, Bell, Settings } from "lucide-react";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileFAB } from "./MobileFAB";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 md:h-16 border-b border-border bg-card shadow-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <SidebarTrigger className="p-2 hover:bg-muted rounded-lg transition-smooth flex-shrink-0 hidden md:block" />
              
              {/* Mobile: Show search icon */}
              <div className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {/* Desktop: Show search input */}
              <div className="relative hidden md:block flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search across all items..."
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 hidden md:flex">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main 
            className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto max-w-full"
            style={{
              paddingBottom: isMobile ? "calc(env(safe-area-inset-bottom) + 5rem)" : undefined,
            }}
          >
            <div className="max-w-[1800px] mx-auto w-full">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Navigation */}
        <MobileBottomNav />
        <MobileFAB />
      </div>
    </SidebarProvider>
  );
}