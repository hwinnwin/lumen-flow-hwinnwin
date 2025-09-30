import { useState } from "react";
import { 
  Crown, 
  LayoutDashboard, 
  Inbox, 
  Workflow, 
  BookOpen, 
  Lightbulb,
  Plus,
  Search
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import lumenLogo from "@/assets/lumen-logo.png";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inbox", url: "/inbox", icon: Inbox },
  { title: "Workflow", url: "/workflow", icon: Workflow },
  { title: "Codex", url: "/codex", icon: BookOpen },
  { title: "Insights", url: "/insights", icon: Lightbulb },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClasses = (path: string) =>
    isActive(path)
      ? "bg-gradient-primary text-primary-foreground shadow-glow font-medium"
      : "hover:bg-sidebar-accent transition-smooth";

  return (
    <Sidebar
      className={`${
        state === "collapsed" ? "w-16" : "w-72"
      } border-r border-sidebar-border bg-sidebar shadow-card transition-all duration-300 ease-in-out`}
      collapsible="icon"
    >
      <SidebarContent className="p-0">
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img 
                src={lumenLogo} 
                alt="Lumen Flow" 
                className="w-10 h-10 rounded-lg shadow-glow"
              />
              <div className="absolute inset-0 bg-gradient-glow opacity-30 rounded-lg" />
            </div>
            {state !== "collapsed" && (
              <div className="animate-fade-in overflow-hidden">
                <h1 className="text-xl font-bold bg-gradient-royal bg-clip-text text-transparent whitespace-nowrap">
                  Lumen Flow
                </h1>
                <p className="text-sm text-muted-foreground whitespace-nowrap">knowledge & workflow organiser</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Action */}
        {state !== "collapsed" && (
          <div className="p-4 border-b border-sidebar-border animate-fade-in">
            <Button 
              className="w-full bg-gradient-primary text-primary-foreground shadow-royal hover:shadow-glow transition-royal"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Quick Add
            </Button>
          </div>
        )}

        {state === "collapsed" && (
          <div className="p-3 border-b border-sidebar-border flex justify-center">
            <Button 
              className="w-10 h-10 p-0 bg-gradient-primary text-primary-foreground shadow-royal hover:shadow-glow transition-royal"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          {state !== "collapsed" && (
            <SidebarGroupLabel className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="px-3">
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`${getNavClasses(item.url)} px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium w-full transition-all duration-200 ${
                        state === "collapsed" ? "justify-center" : ""
                      }`}
                      title={state === "collapsed" ? item.title : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {state !== "collapsed" && <span className="animate-fade-in">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Section */}
        {state !== "collapsed" && (
          <div className="mt-auto p-4 border-t border-sidebar-border animate-fade-in">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <Crown className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">User</p>
                <p className="text-xs text-muted-foreground">Free Plan</p>
              </div>
            </div>
          </div>
        )}
        
        {state === "collapsed" && (
          <div className="mt-auto p-3 border-t border-sidebar-border flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center hover-scale cursor-pointer" title="User Profile">
              <Crown className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}