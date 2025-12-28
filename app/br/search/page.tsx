import { Metadata } from "next"
import SearchPageComponent from "@/components/search-page"

export const metadata: Metadata = {
  title: "Buscar | OpenJobMarket",
  description: "Procure empregos, talentos, profissionais e serviços no OpenJobMarket",
}

export default function SearchPageBR() {
  return <SearchPageComponent />
}
