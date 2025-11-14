"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Category {
  name: string
  icon: string
  color: string
}

interface CategoryCarouselProps {
  onCategoryClick: (name: string) => void
}

export function CategoryCarousel({ onCategoryClick }: CategoryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const categories: Category[] = [
    // Most Popular - Priority Order
    { name: "Plumber", icon: "🔧", color: "from-blue-500 to-blue-600" },
    { name: "Gas Engineer", icon: "🔥", color: "from-orange-600 to-orange-700" },
    { name: "Electrician", icon: "⚡", color: "from-yellow-500 to-orange-500" },
    { name: "Plasterer", icon: "🧱", color: "from-stone-500 to-stone-600" },
    { name: "Care Worker", icon: "🤝", color: "from-green-400 to-emerald-500" },
    { name: "Man With a Van", icon: "🚐", color: "from-blue-600 to-cyan-600" },
    { name: "Programmer", icon: "💻", color: "from-blue-600 to-indigo-600" },
    { name: "Delivery", icon: "📦", color: "from-orange-500 to-red-500" },
    { name: "Roofer", icon: "🏘️", color: "from-gray-600 to-gray-700" },
    { name: "Builder (Construction)", icon: "🏗️", color: "from-orange-500 to-red-500" },
    { name: "Cleaner", icon: "✨", color: "from-cyan-500 to-blue-500" },
    { name: "Bathrooms", icon: "🛁", color: "from-teal-500 to-teal-600" },
    { name: "Windows/Doors", icon: "🪟", color: "from-sky-500 to-sky-600" },
    { name: "Driveways", icon: "🛤️", color: "from-zinc-500 to-zinc-600" },
    { name: "Labour", icon: "👷", color: "from-amber-600 to-orange-600" },
    { name: "Nurse", icon: "👩‍⚕️", color: "from-red-400 to-pink-400" },
    { name: "Driver", icon: "🚗", color: "from-blue-400 to-cyan-400" },
    { name: "Warehouse", icon: "📦", color: "from-orange-600 to-red-600" },
    { name: "Gardener", icon: "🌿", color: "from-green-500 to-emerald-600" },
    { name: "Administrator", icon: "📋", color: "from-slate-600 to-gray-600" },
    { name: "Tiler", icon: "◼️", color: "from-slate-500 to-slate-600" },

    // Other Popular Trades
    { name: "Carpenter", icon: "🪵", color: "from-amber-600 to-amber-700" },
    { name: "Painter", icon: "🖌️", color: "from-purple-500 to-pink-500" },
    { name: "Handyman", icon: "🔨", color: "from-indigo-500 to-indigo-600" },
    { name: "Locksmith", icon: "🔑", color: "from-red-500 to-red-600" },
    { name: "Heating", icon: "♨️", color: "from-rose-500 to-rose-600" },
    { name: "Fencing", icon: "⬛", color: "from-lime-600 to-lime-700" },
    { name: "Tree Surgeon", icon: "🌲", color: "from-emerald-600 to-emerald-700" },
    { name: "Mechanic", icon: "🔩", color: "from-gray-500 to-gray-600" },
    { name: "Flooring", icon: "📐", color: "from-brown-500 to-amber-600" },
    { name: "Kitchen Fitter", icon: "🍽️", color: "from-orange-400 to-red-500" },
    { name: "HVAC", icon: "🌡️", color: "from-blue-400 to-cyan-500" },
    { name: "Glazier", icon: "🪞", color: "from-sky-400 to-blue-500" },
    { name: "Decorator", icon: "🎨", color: "from-pink-400 to-purple-500" },
    { name: "Bricklayer", icon: "🧱", color: "from-red-600 to-orange-600" },
    { name: "Scaffolder", icon: "🏗️", color: "from-gray-500 to-slate-600" },
    { name: "Welder", icon: "⚡", color: "from-yellow-600 to-orange-600" },

    // Tech & IT
    { name: "Software Engineer", icon: "⚙️", color: "from-indigo-600 to-purple-600" },
    { name: "Web Designer", icon: "🎨", color: "from-pink-500 to-rose-500" },
    { name: "Designer", icon: "✏️", color: "from-violet-500 to-purple-500" },
    { name: "AI Specialist", icon: "🤖", color: "from-cyan-600 to-blue-600" },
    { name: "IT Support", icon: "🖥️", color: "from-blue-500 to-cyan-500" },
    { name: "Data Analyst", icon: "📊", color: "from-green-600 to-teal-600" },
    { name: "Cybersecurity", icon: "🔒", color: "from-red-600 to-pink-600" },
    { name: "DevOps", icon: "🔄", color: "from-purple-600 to-indigo-600" },

    // Healthcare
    { name: "Doctor", icon: "🩺", color: "from-blue-400 to-cyan-400" },
    { name: "Pharmacist", icon: "💊", color: "from-green-500 to-emerald-600" },
    { name: "Dentist", icon: "🦷", color: "from-sky-400 to-blue-500" },

    // Professional Services
    { name: "Accountant", icon: "💰", color: "from-green-600 to-teal-600" },
    { name: "Marketing", icon: "📢", color: "from-orange-500 to-amber-500" },
    { name: "Sales", icon: "💼", color: "from-blue-500 to-sky-500" },
    { name: "HR Manager", icon: "👥", color: "from-purple-500 to-violet-500" },
    { name: "Lawyer", icon: "⚖️", color: "from-gray-700 to-slate-700" },
    { name: "Teacher", icon: "📚", color: "from-amber-500 to-yellow-500" },
    { name: "Recruiter", icon: "🎯", color: "from-indigo-500 to-purple-500" },
    { name: "Consultant", icon: "💡", color: "from-yellow-500 to-orange-500" },
    { name: "Architect", icon: "📐", color: "from-slate-600 to-gray-700" },

    // Other Services
    { name: "Chef", icon: "👨‍🍳", color: "from-red-500 to-orange-500" },
    { name: "Security", icon: "🛡️", color: "from-slate-700 to-zinc-700" },
    { name: "Photographer", icon: "📷", color: "from-purple-400 to-pink-500" },
    { name: "Barber", icon: "✂️", color: "from-red-500 to-pink-500" },
    { name: "Personal Trainer", icon: "💪", color: "from-orange-500 to-red-500" },
    { name: "Event Planner", icon: "🎉", color: "from-pink-500 to-purple-500" },
  ]

  const itemsPerRow = 8 // Show 8 items per row
  const itemsToShow = itemsPerRow * 2 // 2 rows
  const maxIndex = Math.max(0, Math.ceil(categories.length / itemsPerRow) - 2)

  const handlePrev = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1))
  }

  const handleNext = () => {
    setCurrentIndex(Math.min(maxIndex, currentIndex + 1))
  }

  const visibleCategories = categories.slice(currentIndex * itemsPerRow, currentIndex * itemsPerRow + itemsToShow)

  return (
    <div className="relative mx-auto flex items-center gap-1">
      {/* Left Arrow */}
      <Button
        onClick={handlePrev}
        disabled={currentIndex === 0}
        className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed p-0"
        variant="outline"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {/* Categories Container - 2 Rows */}
      <div className="flex-1 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-0.5">
        {visibleCategories.map((category) => (
          <button
            key={category.name}
            onClick={() => onCategoryClick(category.name)}
            className={`group relative overflow-hidden rounded-lg p-0.5 bg-gradient-to-br ${category.color} text-white shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 aspect-square max-w-[100px]`}
          >
            <div className="flex flex-col items-center justify-center text-center h-full gap-0.5">
              <div className="flex items-center justify-center flex-shrink-0">
                <span className="text-4xl sm:text-5xl drop-shadow-lg leading-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{category.icon}</span>
              </div>
              <span className="text-[11px] sm:text-xs font-bold drop-shadow-md leading-tight line-clamp-2 px-1">{category.name}</span>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      <Button
        onClick={handleNext}
        disabled={currentIndex >= maxIndex}
        className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed p-0"
        variant="outline"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  )
}
