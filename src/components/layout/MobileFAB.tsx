import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FABAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export function MobileFAB() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Determine context-aware actions based on current route
  const getActionsForRoute = (): FABAction[] => {
    switch (location.pathname) {
      case "/":
      case "/dashboard":
        return [
          {
            label: "New Task",
            icon: "✓",
            onClick: () => {
              setOpen(false);
              // Navigate to workflow with task dialog open
              window.location.href = "/workflow?new=task";
            },
          },
        ];
      case "/workflow":
        return [
          {
            label: "New Task",
            icon: "✓",
            onClick: () => {
              setOpen(false);
              // Trigger task dialog
            },
          },
        ];
      case "/projects":
        return [
          {
            label: "New Project",
            icon: "📁",
            onClick: () => {
              setOpen(false);
              // Trigger project dialog
            },
          },
        ];
      case "/library":
        return [
          {
            label: "Upload Document",
            icon: "📄",
            onClick: () => {
              setOpen(false);
              // Trigger file upload
              document.getElementById("file-upload")?.click();
            },
          },
        ];
      case "/principles":
        return [
          {
            label: "New Principle",
            icon: "⭐",
            onClick: () => {
              setOpen(false);
              // Trigger principle dialog
            },
          },
        ];
      default:
        return [];
    }
  };

  const actions = getActionsForRoute();

  if (actions.length === 0) return null;

  const handlePrimaryAction = () => {
    if (actions.length === 1) {
      actions[0].onClick();
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        onClick={handlePrimaryAction}
        className={cn(
          "fixed z-40 w-14 h-14 rounded-full shadow-royal md:hidden",
          "bg-gradient-primary hover:shadow-glow transition-royal"
        )}
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 5rem)",
          right: "1rem",
        }}
        size="icon"
        aria-label="Quick action"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Quick Actions</SheetTitle>
            <SheetDescription>Choose an action to perform</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 pt-4">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant="outline"
                className="h-auto py-4 justify-start gap-3"
              >
                <span className="text-2xl">{action.icon}</span>
                <span>{action.label}</span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
