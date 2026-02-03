"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

// Bottom sheet states
export type BottomSheetState = "split" | "fullList" | "previewCard"

interface MobileMapBottomSheetProps {
  state: BottomSheetState
  onStateChange: (state: BottomSheetState) => void
  mapContent: React.ReactNode
  listContent: React.ReactNode
  previewCardContent?: React.ReactNode
  resultsCount?: number
  resultsLabel?: string
}

export function MobileMapBottomSheet({
  state,
  onStateChange,
  mapContent,
  listContent,
  previewCardContent,
  resultsCount = 0,
  resultsLabel = "Found",
}: MobileMapBottomSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number>(0)
  const dragStartHeight = useRef<number>(0)
  const [isDragging, setIsDragging] = useState(false)
  const [currentHeight, setCurrentHeight] = useState<number | null>(null)

  // Calculate heights based on state
  const getSheetHeight = useCallback(() => {
    switch (state) {
      case "fullList":
        return "calc(100% - 60px)" // Leave small map peek
      case "previewCard":
        return "75%" // 75% card, 25% map - more space for content
      case "split":
      default:
        return "60%" // 40% map, 60% list
    }
  }, [state])

  // Reset currentHeight when state changes
  useEffect(() => {
    setCurrentHeight(null)
  }, [state])

  // Handle touch/drag start
  const handleDragStart = useCallback((clientY: number) => {
    // Don't allow dragging when showing preview card - use close button instead
    if (state === "previewCard") return

    setIsDragging(true)
    dragStartY.current = clientY
    if (sheetRef.current) {
      dragStartHeight.current = sheetRef.current.getBoundingClientRect().height
    }
  }, [state])

  // Handle touch/drag move
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging || !containerRef.current || state === "previewCard") return

    const deltaY = dragStartY.current - clientY
    const containerHeight = containerRef.current.getBoundingClientRect().height
    const newHeight = Math.max(
      100, // Minimum height
      Math.min(containerHeight - 60, dragStartHeight.current + deltaY) // Max height
    )

    setCurrentHeight(newHeight)
  }, [isDragging, state])

  // Handle touch/drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging || !containerRef.current || state === "previewCard") {
      setIsDragging(false)
      return
    }

    setIsDragging(false)

    if (currentHeight === null) return

    const containerHeight = containerRef.current.getBoundingClientRect().height
    const heightPercentage = currentHeight / containerHeight

    // Determine which state to snap to based on drag position
    if (heightPercentage > 0.85) {
      onStateChange("fullList")
    } else if (heightPercentage < 0.35) {
      onStateChange("split")
    } else if (heightPercentage > 0.65) {
      onStateChange("fullList")
    } else {
      onStateChange("split")
    }

    setCurrentHeight(null)
  }, [isDragging, currentHeight, onStateChange, state])

  // Touch event handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY)
  }, [handleDragStart])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY)
  }, [handleDragMove])

  const onTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Mouse event handlers for desktop testing
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (state === "previewCard") return
    e.preventDefault()
    handleDragStart(e.clientY)

    const onMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY)
    }

    const onMouseUp = () => {
      handleDragEnd()
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }, [handleDragStart, handleDragMove, handleDragEnd, state])

  // Quick action buttons
  const handleExpandClick = useCallback(() => {
    if (state === "fullList") {
      onStateChange("split")
    } else {
      onStateChange("fullList")
    }
  }, [state, onStateChange])

  const sheetStyle: React.CSSProperties = {
    height: currentHeight !== null ? `${currentHeight}px` : getSheetHeight(),
    transition: isDragging ? "none" : "height 0.3s ease-out",
  }

  // When showing preview card, render without drag handle for cleaner look
  const isShowingPreview = state === "previewCard" && previewCardContent

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full overflow-hidden bg-gray-100"
    >
      {/* Map Section - Takes remaining space */}
      <div
        className="relative flex-1 min-h-0"
        style={{
          minHeight: state === "fullList" ? "60px" : state === "previewCard" ? "25%" : "30%",
          transition: isDragging ? "none" : "min-height 0.3s ease-out"
        }}
      >
        {mapContent}

        {/* Results Counter Badge - Top Right of Map */}
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-3 py-1.5 border border-gray-200">
            <span className="font-semibold text-sm text-gray-800">
              {resultsCount} {resultsLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden relative z-20 ${
          isShowingPreview ? "rounded-t-2xl" : "rounded-t-3xl"
        }`}
        style={sheetStyle}
      >
        {/* Drag Handle - Only show when not in preview mode */}
        {!isShowingPreview && (
          <div
            className="flex flex-col items-center py-3 cursor-grab active:cursor-grabbing touch-none select-none flex-shrink-0"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
          >
            {/* Visual Handle Bar */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />

            {/* Expand/Collapse Indicator */}
            <button
              onClick={handleExpandClick}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors py-1 px-3"
            >
              {state === "fullList" ? (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Show Map</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Expand List</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className={`flex-1 overflow-hidden ${isShowingPreview ? "h-full" : "overflow-y-auto overscroll-contain"}`}>
          {isShowingPreview ? (
            <div className="h-full relative">
              {previewCardContent}
            </div>
          ) : (
            listContent
          )}
        </div>
      </div>
    </div>
  )
}
