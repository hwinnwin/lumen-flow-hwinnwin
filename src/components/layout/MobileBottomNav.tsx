import { useLocation, useNavigate } from "react-router-dom";
import { Home, Columns3, FolderKanban, Library, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Workflow", path: "/workflow", icon: Columns3 },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Library", path: "/library", icon: Library },
  { label: "More", path: "/more", icon: Menu },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (path: string) => {
    if (path === "/more") {
      // Open a sheet with additional navigation options
      // For now, navigate to notifications
      navigate("/notifications");
    } else {
      navigate(path);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                "active:bg-muted/50",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
            >
              <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
