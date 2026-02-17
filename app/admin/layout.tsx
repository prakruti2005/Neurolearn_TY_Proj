"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  BrainCircuit,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Activity,
  LogOut,
  ShieldCheck,
  Database,
  Bell
} from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/20">
        <AppSidebar pathname={pathname} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="w-px h-6 bg-border" />
            <h2 className="text-lg font-semibold">Admin Console</h2>
          </header>
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

function AppSidebar({ pathname }: { pathname: string }) {
  const menuItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "User Management", url: "/admin/users", icon: Users },
    { title: "Content", url: "/admin/content", icon: FileText },
    { title: "Notifications", url: "/admin/notifications", icon: Bell },
    { title: "System Health", url: "/admin/health", icon: Activity },
    { title: "Seeder", url: "/admin/seed", icon: Database },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4 text-primary font-bold text-xl">
           <BrainCircuit className="h-8 w-8" />
           <span>NeuroAdmin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
           <SidebarGroupContent>
              <SidebarMenu>
                 <SidebarMenuItem>
                    <SidebarMenuButton className="text-destructive hover:text-destructive">
                       <LogOut />
                       <span>Sign Out</span>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
              </SidebarMenu>
           </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
