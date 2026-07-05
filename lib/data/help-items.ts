// Problem-based help items — real photos from /public/Jobs/
// Used by the landing page "What do you need help with?" section
// and the map "Post a Job" category picker.
export const helpItems = [
  { label: "Plumbing",            img: "/Jobs/Fix_leak.png",           category: "Plumbing",              industry: "Plumbing & Heating",             service: "Plumber"                       },
  { label: "Heating",            img: "/Jobs/Boiler_repair.png",      category: "Plumbing",              industry: "Plumbing & Heating",             service: "Boiler Repair"                  },
  { label: "Electrician",        img: "/Jobs/Electrician.png",        category: "Electrical",            industry: "Electrical",                     service: "Electrician"                    },
  { label: "EV charger",         img: "/Jobs/EV_charger.png",         category: "Electrical",            industry: "Electrical",                     service: "EV Charger Installation"        },
  { label: "Extension",          img: "/Jobs/Extension.png",          category: "Construction",          industry: "Construction & Renovation",      service: "Extension Specialist"           },
  { label: "Bricklaying",        img: "/Jobs/Bricklayer.png",         category: "Construction",          industry: "Construction & Renovation",      service: "Bricklayer"                     },
  { label: "Plastering",         img: "/Jobs/Plastering.png",         category: "Plastering",            industry: "Plastering & Rendering",         service: "Plasterer"                      },
  { label: "Rendering",          img: "/Jobs/Rendering.png",          category: "Plastering",            industry: "Plastering & Rendering",         service: "Rendering Specialist"           },
  { label: "Painting",           img: "/Jobs/Painting.png",           category: "Painting & Decorating", industry: "Painting & Decorating",         service: "Painter & Decorator"            },
  { label: "Wallpapering",       img: "/Jobs/Wallpapering.png",       category: "Painting & Decorating", industry: "Painting & Decorating",         service: "Wallpapering"                   },
  { label: "Roof repair",        img: "/Jobs/Roof_repair.png",        category: "Roofing",               industry: "Roofing",                        service: "Roof Repair"                    },
  { label: "Guttering",          img: "/Jobs/Guttering.png",          category: "Roofing",               industry: "Roofing",                        service: "Guttering"                      },
  { label: "Carpentry",          img: "/Jobs/Carpentry.png",          category: "Carpentry",             industry: "Carpentry & Joinery",            service: "Carpenter"                      },
  { label: "Kitchen fitting",    img: "/Jobs/Kitchen_fitter.png",     category: "Carpentry",             industry: "Carpentry & Joinery",            service: "Kitchen Fitter"                 },
  { label: "Gardening",          img: "/Jobs/Gardening.png",          category: "Gardening",             industry: "Gardening & Landscaping",        service: "Gardener"                       },
  { label: "Landscaping",        img: "/Jobs/Landscaping.png",        category: "Gardening",             industry: "Gardening & Landscaping",        service: "Landscaper"                     },
  { label: "Tiling",             img: "/Jobs/Tiling.png",             category: "Flooring",              industry: "Flooring & Tiling",              service: "Tiler"                          },
  { label: "Flooring",           img: "/Jobs/Flooring.png",           category: "Flooring",              industry: "Flooring & Tiling",              service: "Flooring Specialist"            },
  { label: "Cleaning",           img: "/Jobs/Cleaning.png",           category: "Cleaning",              industry: "Cleaning",                       service: "Domestic Cleaner"               },
  { label: "Handyman",           img: "/Jobs/Handyman.jpg",           category: "General Handyman",      industry: "Handyman / Small Jobs",          service: "Handyman"                       },
  { label: "Furniture assembly", img: "/Jobs/Furniture_assembly.png", category: "General Handyman",      industry: "Handyman / Small Jobs",          service: "Furniture Assembly"             },
  { label: "House clearance",    img: "/Jobs/House_clearence.png",    category: "General Handyman",      industry: "Waste Removal",                  service: "House Clearance"                },
  { label: "Man & Van",          img: "/Jobs/Man_van.png",            category: "General Handyman",      industry: "Waste Removal",                  service: "Man & Van"                      },
  { label: "Fencing",            img: "/Jobs/Fencing.png",            category: "Carpentry",             industry: "Fencing & Gates",                service: "Fence Installer"                },
  { label: "Gate installation",  img: "/Jobs/Gate.png",               category: "Carpentry",             industry: "Fencing & Gates",                service: "Gate Installation"              },
  { label: "Driveway",           img: "/Jobs/Driveway.png",           category: "Gardening",             industry: "Gardening & Landscaping",        service: "Patio & Paving Specialist"      },
  { label: "Air conditioning",   img: "/Jobs/Airconditioning.png",    category: "HVAC",                  industry: "Air Conditioning & Ventilation", service: "Air Conditioning Installation"  },
  { label: "Tree surgeon",       img: "/Jobs/Tree_surgeon.png",       category: "Gardening",             industry: "Gardening & Landscaping",        service: "Tree Surgeon"                   },
] as const

export type HelpItem = typeof helpItems[number]
