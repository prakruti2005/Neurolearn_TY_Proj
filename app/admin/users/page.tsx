"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, MoreHorizontal, UserPlus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  displayName: string
  email: string
  role: string
  status?: string
}

export default function UserManagementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newDisplayName, setNewDisplayName] = useState("")

  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [editDisplayName, setEditDisplayName] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editStatus, setEditStatus] = useState("")

  async function fetchUsers() {
    try {
      const querySnapshot = await getDocs(collection(db, "user"))
      const fetched: User[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetched.push({
          id: doc.id,
          displayName: data.displayName || "Unknown",
          email: data.email || "",
          role: data.role || "student",
          status: data.status || "Active",
        })
      })
      setUsers(fetched)
    } catch (error) {
      console.error("Error users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const openView = (u: User) => {
    setSelectedUser(u)
    setViewOpen(true)
  }

  const openEdit = (u: User) => {
    setSelectedUser(u)
    setEditDisplayName(u.displayName || "")
    setEditRole(u.role || "student")
    setEditStatus(u.status || "Active")
    setEditOpen(true)
  }

  const openDelete = (u: User) => {
    setSelectedUser(u)
    setDeleteOpen(true)
  }

  const saveEdits = async () => {
    if (!selectedUser) return
    setSavingEdit(true)
    try {
      await updateDoc(doc(db, "user", selectedUser.id), {
        displayName: editDisplayName.trim() || selectedUser.displayName,
        role: editRole.trim() || selectedUser.role,
        status: editStatus.trim() || selectedUser.status || "Active",
      })
      toast({ title: "User updated", description: "Profile updated in Firestore." })
      setEditOpen(false)
      setSelectedUser(null)
      setLoading(true)
      await fetchUsers()
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Failed to update user", variant: "destructive" })
    } finally {
      setSavingEdit(false)
    }
  }

  const deleteUser = async () => {
    if (!selectedUser) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, "user", selectedUser.id))
      toast({ title: "User deleted", description: "User profile deleted from Firestore." })
      setDeleteOpen(false)
      setSelectedUser(null)
      setLoading(true)
      await fetchUsers()
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Failed to delete user", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const createTeacher = async () => {
    if (!user) {
      toast({ title: "Not signed in", description: "Sign in as an admin first.", variant: "destructive" })
      return
    }
    if (!newEmail.trim() || !newPassword.trim()) {
      toast({ title: "Missing fields", description: "Email and password are required.", variant: "destructive" })
      return
    }

    setCreating(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          displayName: newDisplayName.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to create teacher")

      toast({ title: "Teacher created", description: "Teacher account created in Auth + profile saved in Firestore." })
      setCreateOpen(false)
      setNewEmail("")
      setNewPassword("")
      setNewDisplayName("")
      setLoading(true)
      await fetchUsers()
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage students, teachers, and administrators.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Teacher Account</DialogTitle>
              <DialogDescription>
                Teachers cannot self-register. This creates a Firebase Auth user and stores a profile in Firestore collection "user".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacherName">Display name</Label>
                <Input
                  id="teacherName"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Prof. Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherEmail">Email</Label>
                <Input
                  id="teacherEmail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherPassword">Temporary password</Label>
                <Input
                  id="teacherPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Set a strong password"
                  type="password"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={createTeacher} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Teacher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search users..." className="pl-8" />
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                 <TableCell colSpan={4} className="h-24 text-center">
                   <div className="flex items-center justify-center gap-2">
                     <Loader2 className="h-6 w-6 animate-spin text-primary" />
                     <span>Loading users...</span>
                   </div>
                 </TableCell>
               </TableRow>
            ) : users.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={4} className="h-24 text-center">
                   No users found.
                 </TableCell>
               </TableRow>
            ) : (
              users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`/placeholder-user.jpg`} alt={user.displayName} />
                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} className="capitalize">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      user.status === "Active"
                        ? "text-green-600 border-green-600 bg-green-50"
                        : user.status === "Inactive"
                          ? "text-gray-600 border-gray-600 bg-gray-50"
                          : "text-red-600 border-red-600 bg-red-50"
                    }

                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openView(user)}>View Profile</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(user)}>Edit User</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => openDelete(user)}>
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>Profile details stored in Firestore.</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Name</span>
                <span className="col-span-2 font-medium">{selectedUser.displayName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="col-span-2 font-medium">{selectedUser.email}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Role</span>
                <span className="col-span-2 font-medium capitalize">{selectedUser.role}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Status</span>
                <span className="col-span-2 font-medium">{selectedUser.status || "Active"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">UID</span>
                <span className="col-span-2 font-mono text-xs break-all">{selectedUser.id}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Updates the Firestore profile document.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Display name</Label>
              <Input id="editName" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <select
                id="editRole"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="student">student</option>
                <option value="teacher">teacher</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStatus">Status</Label>
              <select
                id="editStatus"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={saveEdits} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the user profile document from Firestore. It does not delete the Firebase Auth account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
