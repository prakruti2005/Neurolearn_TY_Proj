"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/firebase-auth"
import { BrainCircuit, LogOut, User, LayoutDashboard, Bell } from "lucide-react"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"

export function Navbar() {
  const { user, userProfile } = useAuth()
  const { notifications, unreadCount, markAllAsRead, markAsRead, deleteRead } = useNotifications()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
        <div className="glass-card rounded-full px-6 md:px-10 h-16 flex items-center justify-between backdrop-blur-2xl">
          <Link href="/" className="flex items-center gap-2 font-black text-2xl tracking-tighter text-foreground">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground shadow-lg shadow-primary/30">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <span className="hidden sm:inline font-display">NeuroLearn</span>
          </Link>
          <div className="w-[172px]" />
        </div>
      </nav>
    )
  }

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="glass-card rounded-full px-6 md:px-10 h-16 flex items-center justify-between backdrop-blur-2xl">
        <Link href="/" className="flex items-center gap-2 font-black text-2xl tracking-tighter text-foreground">
          <div className="p-1.5 bg-primary rounded-lg text-primary-foreground shadow-lg shadow-primary/30">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <span className="hidden sm:inline font-display">NeuroLearn</span>
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/community" className="text-sm font-medium hover:text-primary hidden md:block">
                Community
              </Link>
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary hidden md:block">
                Dashboard
              </Link>
              <Link href="/courses" className="text-sm font-medium hover:text-primary hidden md:block">
                Courses
              </Link>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-background" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                    )}
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="p-2 space-y-1">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => markAsRead(n.id)}
                            className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-muted cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="text-sm font-semibold">{n.title}</h5>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  {notifications.length > 0 && (
                    <div className="p-2 border-t grid grid-cols-2 gap-2">
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => markAllAsRead()}>
                        Mark all read
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => deleteRead()}>
                        Clear read
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {userProfile?.displayName?.charAt(0) || user.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile?.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:text-primary">
                Sign In
              </Link>
              <Button asChild>
                <Link href="/login?mode=signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

