"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Send, Minimize2, GripVertical } from "lucide-react"

interface FloatingMessageModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  userId: string
  conversationId: string
  jobId?: string
}

export default function FloatingMessageModal({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientAvatar,
  userId,
  conversationId,
  jobId,
}: FloatingMessageModalProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const sendMessage = async () => {
    if (!message.trim()) return
    setSending(true)

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipient_id: recipientId,
          content: message.trim(),
          job_id: jobId ?? undefined,
          conversation_id: conversationId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // 409 = chat not unlocked yet
        if (res.status === 409) {
          alert(data?.error ?? "Wait for the homeowner to reply before sending another message.")
        } else {
          alert(data?.error ?? "Failed to send message.")
        }
        return
      }

      setMessage("")
      setMessageSent(true)

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("message-sent", {
          detail: { recipientId, conversationId },
        }))
      }

      setTimeout(() => {
        setMessageSent(false)
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error("[FLOATING-MODAL] Exception:", error)
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

  // Auto-resize textarea as content grows
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [message])

  // Debug: Log when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[FLOATING-MODAL] ✅ Modal component mounted and isOpen=true')
      console.log('[FLOATING-MODAL] Props:', { recipientId, recipientName, userId, conversationId })
    }
  }, [isOpen])

  if (!isOpen) {
    console.log('[FLOATING-MODAL] ❌ Not rendering - isOpen is false')
    return null
  }

  console.log('[FLOATING-MODAL] 🎨 Rendering modal...')
  console.log('[FLOATING-MODAL] 🌐 Using React Portal to render at document.body')
  console.log('[FLOATING-MODAL] 📱 Responsive positioning: Mobile (10vh top, 95vw width) | Desktop (15vh top, 384px width)')

  // Use portal to render at document root, bypassing z-index stacking issues
  if (typeof window === 'undefined') return null

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed z-[99999] bg-white rounded-lg shadow-2xl border-2 border-blue-500 flex flex-col
          ${minimized ? 'w-64 h-14' : 'w-[95vw] sm:w-96 max-h-[85vh]'}
          top-[10vh] left-1/2 -translate-x-1/2
          sm:top-[15vh]
        `}
        style={{
          transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
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
          <div className="p-4 overflow-y-auto bg-gray-50 flex-1" style={{ minHeight: '150px', maxHeight: 'calc(85vh - 180px)' }}>
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
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type your message to ${recipientName}...`}
              className="mb-2 resize-none min-h-[60px] max-h-[160px] overflow-y-auto"
              style={{ height: '60px' }}
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
    </>
  )

  return createPortal(modalContent, document.body)
}
