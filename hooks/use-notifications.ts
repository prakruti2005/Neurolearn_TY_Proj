import { useState, useEffect } from "react"
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where, 
  doc, 
  updateDoc, 
  writeBatch,
  deleteDoc
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export interface Notification {
  id: string
  title: string
  body: string
  createdAt: any // Timestamp
  read: boolean
  type?: string
  link?: string
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    // Query last 50 notifications
    const q = query(
      collection(db, "user", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
        }
      }) as Notification[]
      
      setNotifications(items)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (id: string) => {
    if (!user) return
    try {
      await updateDoc(doc(db, "user", user.uid, "notifications", id), {
        read: true
      })
    } catch (e) {
      console.error("Failed to mark notification as read", e)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return
    const batch = writeBatch(db)
    const unread = notifications.filter(n => !n.read)
    
    if (unread.length === 0) return

    unread.forEach(n => {
      const ref = doc(db, "user", user.uid, "notifications", n.id)
      batch.update(ref, { read: true })
    })

    try {
      await batch.commit()
    } catch (e) {
      console.error("Failed to mark all as read", e)
    }
  }

  const deleteRead = async () => {
    if (!user) return
    const readItems = notifications.filter((n) => n.read)
    if (readItems.length === 0) return

    const batch = writeBatch(db)
    readItems.forEach((n) => {
      const ref = doc(db, "user", user.uid, "notifications", n.id)
      batch.delete(ref)
    })

    try {
      await batch.commit()
    } catch (e) {
      console.error("Failed to delete read notifications", e)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteRead
  }
}
