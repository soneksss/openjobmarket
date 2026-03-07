export interface SuccessStory {
  id: string
  name: string
  role: string
  image: string
  quote: string
  highlight: string
  highlightIcon: string
  gradientFrom: string
  gradientTo: string
}

export const successStoriesByTab: Record<string, SuccessStory[]> = {
  traders: [
    {
      id: "trader-1",
      name: "Mike Thompson",
      role: "Master Electrician",
      image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop",
      quote: "Since joining Open Job Market, my business has grown 40%. I'm finding local jobs in my area every day without spending on advertising.",
      highlight: "40% business growth in 6 months",
      highlightIcon: "📈",
      gradientFrom: "from-orange-100",
      gradientTo: "to-orange-200",
    },
    {
      id: "trader-2",
      name: "Sarah Williams",
      role: "Plumbing Contractor",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
      quote: "The map feature is amazing. I can see all the jobs near my current location and plan my day efficiently. Less driving, more earning.",
      highlight: "30% less travel time",
      highlightIcon: "🗺️",
      gradientFrom: "from-orange-100",
      gradientTo: "to-orange-200",
    },
    {
      id: "trader-3",
      name: "David Chen",
      role: "General Builder",
      image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop",
      quote: "Getting reviews from homeowners has helped me build trust. New customers often mention they chose me because of my profile ratings.",
      highlight: "50+ 5-star reviews",
      highlightIcon: "⭐",
      gradientFrom: "from-orange-100",
      gradientTo: "to-orange-200",
    },
  ],
  jobs_tasks: [
    {
      id: "tradejob-1",
      name: "Emily Foster",
      role: "Homeowner",
      image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
      quote: "Found a fantastic kitchen fitter within 2 hours of posting my job. The quotes came in quickly and I could compare them easily.",
      highlight: "Job completed in 3 days",
      highlightIcon: "🏠",
      gradientFrom: "from-purple-100",
      gradientTo: "to-purple-200",
    },
    {
      id: "tradejob-2",
      name: "Robert Clarke",
      role: "Property Manager",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop",
      quote: "Managing multiple properties means constant repairs. This platform has become my go-to for finding reliable tradespeople fast.",
      highlight: "20+ jobs completed",
      highlightIcon: "🔧",
      gradientFrom: "from-purple-100",
      gradientTo: "to-purple-200",
    },
    {
      id: "tradejob-3",
      name: "Lisa Anderson",
      role: "Landlord",
      image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=300&fit=crop",
      quote: "Emergency plumbing issue on a Sunday? Posted the job and had someone at the property within 2 hours. Lifesaver!",
      highlight: "2-hour emergency response",
      highlightIcon: "⚡",
      gradientFrom: "from-purple-100",
      gradientTo: "to-purple-200",
    },
  ],
  vacancies: [
    {
      id: "vacancy-1",
      name: "TechTeam Solutions",
      role: "HR Director",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%281%29%281%29%281%29-UAuvnlHA8UfziXp43l14u51SSVEFHh.png",
      quote: "Our entire development team found better positions through Open Job Market. The collaborative approach helped us all transition together.",
      highlight: "4 team members hired together",
      highlightIcon: "👥",
      gradientFrom: "from-blue-100",
      gradientTo: "to-blue-200",
    },
    {
      id: "vacancy-2",
      name: "Maria R.",
      role: "Data Scientist",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%281%29%281%29%281%29-rC8EooxhaNniFv0gUXUwir3AgEmlSx.png",
      quote: "Working late nights on my current project, I quietly searched for remote opportunities. Found my dream role at a Fortune 500 company.",
      highlight: "100% remote position secured",
      highlightIcon: "🏠",
      gradientFrom: "from-blue-100",
      gradientTo: "to-blue-200",
    },
    {
      id: "vacancy-3",
      name: "James K.",
      role: "Project Manager",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image.png%281%29%281%29%281%29-Lq3ft08YXKDBM29jKfdrWN0e8WQBWO.jpeg",
      quote: "From construction sites to corporate leadership. The platform helped me transition my project management skills into a senior role.",
      highlight: "Career advancement to leadership",
      highlightIcon: "⬆️",
      gradientFrom: "from-blue-100",
      gradientTo: "to-blue-200",
    },
  ],
  talents: [
    {
      id: "talent-1",
      name: "GlobalTech Inc.",
      role: "Recruiting Manager",
      image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop",
      quote: "The anonymous candidate feature is brilliant. We found excellent developers who weren't actively looking but were open to the right opportunity.",
      highlight: "5 passive candidates hired",
      highlightIcon: "🎯",
      gradientFrom: "from-emerald-100",
      gradientTo: "to-emerald-200",
    },
    {
      id: "talent-2",
      name: "StartupHub",
      role: "CEO",
      image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop",
      quote: "As a startup, we needed to find local talent quickly. The map-based search helped us discover amazing candidates right in our neighborhood.",
      highlight: "Built a team of 8 in 2 months",
      highlightIcon: "🚀",
      gradientFrom: "from-emerald-100",
      gradientTo: "to-emerald-200",
    },
    {
      id: "talent-3",
      name: "CraftBrew Ltd.",
      role: "Operations Director",
      image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=300&fit=crop",
      quote: "Finding skilled workers in our industry was always challenging. This platform connected us with qualified candidates we never knew existed.",
      highlight: "Reduced hiring time by 60%",
      highlightIcon: "⏰",
      gradientFrom: "from-emerald-100",
      gradientTo: "to-emerald-200",
    },
  ],
}

export function getHighlightColor(searchType: string): string {
  const colors: Record<string, string> = {
    traders: "#ea580c", // orange-600
    jobs_tasks: "#9333ea", // purple-600
    vacancies: "#2563eb", // blue-600
    talents: "#059669", // emerald-600
  }
  return colors[searchType] || colors.vacancies
}
