"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Send, Minimize2, GripVertical } from "lucide-react"
import { createClient } from "@/lib/client"

interface FloatingMessageModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  userId: string
  conversationId: string
}

export default function FloatingMessageModal({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientAvatar,
  userId,
  conversationId
}: FloatingMessageModalProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messageSent, setMessageSent] = useState(false)

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Create client once on mount to avoid re-initialization issues
  const [supabase] = useState(() => createClient())

  const sendMessage = async () => {
    if (!message.trim()) return

    console.log('[FLOATING-MODAL] Sending message...')
    console.log('[FLOATING-MODAL] User ID:', userId)
    console.log('[FLOATING-MODAL] Recipient ID:', recipientId)
    setSending(true)

    try {
      // Prepare message data
      const messageData = {
        sender_id: userId,
        recipient_id: recipientId,
        subject: "New Message",
        content: message.trim(),
        conversation_id: conversationId,
        message_type: "direct",
      }

      console.log('[FLOATING-MODAL] Message data:', messageData)
      console.log('[FLOATING-MODAL] Starting database insert...')

      // Try direct insert with aggressive timeout
      const startTime = Date.now()
      console.log('[FLOATING-MODAL] Starting direct insert...')
      console.log('[FLOATING-MODAL] Supabase client:', supabase ? 'initialized' : 'NOT initialized')

      let insertData = null
      let messageError = null

      try {
        // Create timeout controller
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort()
          console.error('[FLOATING-MODAL] Aborting insert after 8 seconds')
        }, 8000)

        const { data, error } = await supabase
          .from("messages")
          .insert(messageData)
          .select()
          .abortSignal(controller.signal)

        clearTimeout(timeoutId)
        insertData = data
        messageError = error

        console.log('[FLOATING-MODAL] Insert response received:', { data, error })
      } catch (abortError: any) {
        console.error('[FLOATING-MODAL] Insert aborted or failed:', abortError)
        throw new Error('Database operation timed out. Please check your connection and try again.')
      }

      const duration = Date.now() - startTime
      console.log('[FLOATING-MODAL] Insert completed in', duration, 'ms')

      if (duration > 3000) {
        console.warn('[FLOATING-MODAL] WARNING: Insert took longer than 3 seconds!')
      }

      if (messageError) {
        console.error('[FLOATING-MODAL] Insert error:', messageError)
        console.error('[FLOATING-MODAL] Error code:', messageError?.code)
        console.error('[FLOATING-MODAL] Error message:', messageError?.message)
        console.error('[FLOATING-MODAL] Error details:', messageError?.details)
        console.error('[FLOATING-MODAL] Error hint:', messageError?.hint)

        // Provide user-friendly error messages
        if (messageError.code === 'PGRST116') {
          alert('Permission denied. Please check your account settings.')
        } else if (messageError.message?.includes('foreign key')) {
          alert('Database configuration error. Please contact support.')
        } else if (messageError.message?.includes('timeout')) {
          alert('Database timeout. Please run DEBUG_MESSAGES_TIMEOUT.sql and check server logs.')
        } else {
          alert(`Failed to send message: ${messageError.message}`)
        }
        return
      }

      if (!insertData || insertData.length === 0) {
        console.error('[FLOATING-MODAL] No data returned from insert')
        alert('Message may not have been sent. Please check your messages.')
        return
      }

      console.log('[FLOATING-MODAL] Message sent successfully!')
      console.log('[FLOATING-MODAL] Message ID:', insertData[0]?.id || insertData[0])
      console.log('[FLOATING-MODAL] Sender:', userId)
      console.log('[FLOATING-MODAL] Recipient:', recipientId)
      console.log('[FLOATING-MODAL] Conversation ID:', conversationId)

      setMessage("")
      setMessageSent(true)

      // Dispatch event to notify MessageIcon to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('message-sent', {
          detail: { recipientId, conversationId }
        }))
        console.log('[FLOATING-MODAL] Dispatched message-sent event')
      }

      // Auto-close after 1.5 seconds (moved before verification to ensure it always closes)
      setTimeout(() => {
        setMessageSent(false)
        onClose()
      }, 1500)

      // Verify the message was actually inserted (non-blocking, happens after close)
      setTimeout(async () => {
        try {
          const { data: verifyData, error: verifyError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (verifyError) {
            console.warn('[FLOATING-MODAL] Could not verify message insertion:', verifyError)
          } else {
            console.log('[FLOATING-MODAL] Verified message in DB:', verifyData)
          }
        } catch (e) {
          console.warn('[FLOATING-MODAL] Verification check failed:', e)
        }
      }, 100)
    } catch (error: any) {
      console.error("[FLOATING-MODAL] Exception:", error)
      console.error("[FLOATING-MODAL] Error name:", error?.name)
      console.error("[FLOATING-MODAL] Error message:", error?.message)
      console.error("[FLOATING-MODAL] Error stack:", error?.stack)
      alert("Unexpected error: " + (error?.message || "Unknown error"))
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add/remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart.x, dragStart.y])

  if (!isOpen) return null

  return (
    <div
      className={`fixed bottom-32 right-4 z-[9999] bg-white rounded-lg shadow-2xl border-2 border-blue-500 ${
        minimized ? 'w-64 h-14' : 'w-96 h-[500px]'
      }`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? 'none' : 'width 0.2s, height 0.2s'
      }}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-50 to-blue-100 cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <Avatar className="h-8 w-8 ring-2 ring-blue-300">
            <AvatarImage src={recipientAvatar} />
            <AvatarFallback className="bg-blue-200 text-blue-700 text-xs font-bold">
              {recipientName.split(' ').map(n => n.charAt(0)).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-semibold text-gray-900">{recipientName}</div>
            <div className="text-xs text-gray-500">Professional</div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-blue-200"
            onClick={() => setMinimized(!minimized)}
            title={minimized ? "Expand" : "Minimize"}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-100"
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body - only show when not minimized */}
      {!minimized && (
        <>
          <div className="p-4 overflow-y-auto bg-gray-50" style={{ height: 'calc(100% - 140px)' }}>
            {messageSent ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-green-600 text-4xl mb-2">✓</div>
                  <p className="text-sm font-semibold text-green-700">Message sent!</p>
                  <p className="text-xs text-gray-600 mt-1">Closing...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center p-4 bg-white rounded border">
                  Send a message to <span className="font-semibold">{recipientName}</span>
                </p>
                <div className="text-xs text-gray-500 text-center">
                  <p>💡 Tip: Press Enter to send, Shift+Enter for new line</p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type your message to ${recipientName}...`}
              rows={2}
              className="mb-2 resize-none"
              disabled={sending || messageSent}
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !message.trim() || messageSent}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : messageSent ? "Sent!" : "Send Message"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
