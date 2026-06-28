"use client"

import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import Image from "next/image"

const HELP_ITEMS = [
  { label: "Fix a leak",         img: "/Jobs/Fix_leak.png",           industry: "Plumbing & Heating",             service: "Plumber"                        },
  { label: "Boiler repair",      img: "/Jobs/Boiler_repair.png",      industry: "Plumbing & Heating",             service: "Boiler Repair"                   },
  { label: "Electrician",        img: "/Jobs/Electrician.png",        industry: "Electrical",                     service: "Electrician"                     },
  { label: "EV charger",         img: "/Jobs/EV_charger.png",         industry: "Electrical",                     service: "EV Charger Installation"         },
  { label: "Extension",          img: "/Jobs/Extension.png",          industry: "Construction & Renovation",      service: "Extension Specialist"            },
  { label: "Bricklaying",        img: "/Jobs/Bricklayer.png",         industry: "Construction & Renovation",      service: "Bricklayer"                      },
  { label: "Plastering",         img: "/Jobs/Plastering.png",         industry: "Plastering & Rendering",         service: "Plasterer"                       },
  { label: "Rendering",          img: "/Jobs/Rendering.png",          industry: "Plastering & Rendering",         service: "Rendering Specialist"            },
  { label: "Painting",           img: "/Jobs/Painting.png",           industry: "Painting & Decorating",          service: "Painter & Decorator"             },
  { label: "Wallpapering",       img: "/Jobs/Wallpapering.png",       industry: "Painting & Decorating",          service: "Wallpapering"                    },
  { label: "Roof repair",        img: "/Jobs/Roof_repair.png",        industry: "Roofing",                        service: "Roof Repair"                     },
  { label: "Guttering",          img: "/Jobs/Guttering.png",          industry: "Roofing",                        service: "Guttering"                       },
  { label: "Carpentry",          img: "/Jobs/Carpentry.png",          industry: "Carpentry & Joinery",            service: "Carpenter"                       },
  { label: "Kitchen fitting",    img: "/Jobs/Kitchen_fitter.png",     industry: "Carpentry & Joinery",            service: "Kitchen Fitter"                  },
  { label: "Gardening",          img: "/Jobs/Gardening.png",          industry: "Gardening & Landscaping",        service: "Gardener"                        },
  { label: "Landscaping",        img: "/Jobs/Landscaping.png",        industry: "Gardening & Landscaping",        service: "Landscaper"                      },
  { label: "Tiling",             img: "/Jobs/Tiling.png",             industry: "Flooring & Tiling",              service: "Tiler"                           },
  { label: "Flooring",           img: "/Jobs/Flooring.png",           industry: "Flooring & Tiling",              service: "Flooring Specialist"             },
  { label: "Cleaning",           img: "/Jobs/Cleaning.png",           industry: "Cleaning",                       service: "Domestic Cleaner"                },
  { label: "Handyman",           img: "/Jobs/Handyman.jpg",           industry: "Handyman / Small Jobs",          service: "Handyman"                        },
  { label: "Furniture assembly", img: "/Jobs/Furniture_assembly.png", industry: "Handyman / Small Jobs",          service: "Furniture Assembly"              },
  { label: "House clearance",    img: "/Jobs/House_clearence.png",    industry: "Waste Removal",                  service: "House Clearance"                 },
  { label: "Man & Van",          img: "/Jobs/Man_van.png",            industry: "Waste Removal",                  service: "Man & Van"                       },
  { label: "Fencing",            img: "/Jobs/Fencing.png",            industry: "Fencing & Gates",                service: "Fence Installer"                 },
  { label: "Gate installation",  img: "/Jobs/Gate.png",               industry: "Fencing & Gates",                service: "Gate Installation"               },
  { label: "Driveway",           img: "/Jobs/Driveway.png",           industry: "Gardening & Landscaping",        service: "Patio & Paving Specialist"       },
  { label: "Air conditioning",   img: "/Jobs/Airconditioning.png",    industry: "Air Conditioning & Ventilation", service: "Air Conditioning Installation"   },
  { label: "Tree surgeon",       img: "/Jobs/Tree_surgeon.png",       industry: "Gardening & Landscaping",        service: "Tree Surgeon"                    },
]

interface PostJobCategorySelectorProps {
  onClose: () => void
}

export function PostJobCategorySelector({ onClose }: PostJobCategorySelectorProps) {
  const router = useRouter()

  const handleSelect = (industry: string, service: string) => {
    onClose()
    router.push(`/jobs/new?industry=${encodeURIComponent(industry)}&service=${encodeURIComponent(service)}`)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white">What do you need help with?</h2>
          <p className="text-xs text-slate-400 mt-0.5">Select a trade to post your job</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="grid grid-cols-3 gap-2.5 pb-20">
          {HELP_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => handleSelect(item.industry, item.service)}
              className="group relative rounded-xl overflow-hidden aspect-square bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 transition-all active:scale-95"
            >
              <Image
                src={item.img}
                alt={item.label}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 33vw, 150px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
              <span className="absolute bottom-1.5 left-0 right-0 px-1.5 text-center text-[10px] font-semibold text-white leading-tight">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
