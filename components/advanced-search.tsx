"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, DollarSign, Users, Star, Filter } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void
  initialFilters?: Partial<SearchFilters>
}

interface SearchFilters {
  query: string
  location: string
  radius: number
  jobTypes: string[]
  experienceLevels: string[]
  workLocations: string[]
  salaryMin: number
  salaryMax: number
  industries: string[]
  companySize: string[]
  skills: string[]
  benefits: string[]
  postedWithin: string
  remoteOnly: boolean
  hasEquity: boolean
  isUrgent: boolean
}

const jobTypes = ["full-time", "part-time", "contract", "internship", "temporary"]
const experienceLevels = ["entry", "mid", "senior", "lead", "executive"]
const workLocations = ["on-site", "remote", "hybrid"]
const industries = ["Technology", "Healthcare", "Finance", "Education", "Marketing", "Sales", "Design", "Engineering"]
const companySizes = ["1-10", "11-50", "51-200", "201-1000", "1000+"]
const commonSkills = ["JavaScript", "Python", "React", "Node.js", "SQL", "AWS", "Docker", "TypeScript", "Java", "C++"]
const benefits = ["Health Insurance", "401k", "Flexible Hours", "Remote Work", "Unlimited PTO", "Stock Options"]

export default function AdvancedSearch({ onSearch, initialFilters }: AdvancedSearchProps) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    location: "",
    radius: 25,
    jobTypes: [],
    experienceLevels: [],
    workLocations: [],
    salaryMin: 0,
    salaryMax: 200000,
    industries: [],
    companySize: [],
    skills: [],
    benefits: [],
    postedWithin: "30",
    remoteOnly: false,
    hasEquity: false,
    isUrgent: false,
    ...initialFilters,
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const currentArray = filters[key] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value]
    handleFilterChange(key, newArray)
  }

  const handleSearch = () => {
    onSearch(filters)
  }

  const clearFilters = () => {
    setFilters({
      query: "",
      location: "",
      radius: 25,
      jobTypes: [],
      experienceLevels: [],
      workLocations: [],
      salaryMin: 0,
      salaryMax: 200000,
      industries: [],
      companySize: [],
      skills: [],
      benefits: [],
      postedWithin: "30",
      remoteOnly: false,
      hasEquity: false,
      isUrgent: false,
    })
  }

  return (
    <Card className="w-full shadow-lg border-2">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Search className="h-6 w-6" />
          {t('search.advancedJobSearch')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="query" className="text-base font-semibold text-gray-700 mb-2 block">
              {t('search.jobTitleKeywords')}
            </Label>
            <Input
              id="query"
              placeholder={t('search.jobTitlePlaceholder')}
              value={filters.query}
              onChange={(e) => handleFilterChange("query", e.target.value)}
              className="h-14 text-lg bg-white border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg font-medium placeholder:text-gray-500"
            />
          </div>
          <div>
            <Label htmlFor="location" className="text-base font-semibold text-gray-700 mb-2 block">
              {t('common.location')}
            </Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-5 h-5 w-5 text-gray-500" />
              <Input
                id="location"
                placeholder={t('search.locationPlaceholder')}
                className="pl-12 h-14 text-lg bg-white border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg font-medium placeholder:text-gray-500"
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Location Radius */}
        {filters.location && !filters.remoteOnly && (
          <div className="bg-gray-50 p-6 rounded-lg border">
            <Label className="text-base font-semibold text-gray-700 mb-3 block">
              {t('search.searchRadius')}: {filters.radius} {t('search.miles')}
            </Label>
            <Slider
              value={[filters.radius]}
              onValueChange={(value) => handleFilterChange("radius", value[0])}
              max={100}
              min={5}
              step={5}
              className="mt-2"
            />
          </div>
        )}

        {/* Quick Toggles */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="remote-only"
              checked={filters.remoteOnly}
              onCheckedChange={(checked) => handleFilterChange("remoteOnly", checked)}
            />
            <Label htmlFor="remote-only">{t('search.remoteOnly')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="has-equity"
              checked={filters.hasEquity}
              onCheckedChange={(checked) => handleFilterChange("hasEquity", checked)}
            />
            <Label htmlFor="has-equity">{t('search.equityOptions')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is-urgent"
              checked={filters.isUrgent}
              onCheckedChange={(checked) => handleFilterChange("isUrgent", checked)}
            />
            <Label htmlFor="is-urgent">{t('search.urgentHiring')}</Label>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full">
          <Filter className="h-4 w-4 mr-2" />
          {showAdvanced ? t('search.hide') : t('search.show')} {t('search.advancedFiltersToggle')}
        </Button>

        {showAdvanced && (
          <div className="space-y-6 border-t pt-6">
            {/* Job Type */}
            <div>
              <Label>{t('search.jobType')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {jobTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={filters.jobTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("jobTypes", type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <Label>{t('search.experienceLevel')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {experienceLevels.map((level) => (
                  <Badge
                    key={level}
                    variant={filters.experienceLevels.includes(level) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("experienceLevels", level)}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Work Location */}
            <div>
              <Label>{t('search.workArrangement')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {workLocations.map((location) => (
                  <Badge
                    key={location}
                    variant={filters.workLocations.includes(location) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("workLocations", location)}
                  >
                    {location.charAt(0).toUpperCase() + location.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Salary Range */}
            <div>
              <Label>{t('search.minimumSalary')}</Label>
              <div className="mt-2">
                <Label htmlFor="salary-min" className="text-sm">
                  {t('search.minimum')} (£)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="salary-min"
                    type="number"
                    placeholder="0"
                    className="pl-10"
                    value={filters.salaryMin || ""}
                    onChange={(e) => handleFilterChange("salaryMin", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Industries */}
            <div>
              <Label>{t('search.industry')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {industries.map((industry) => (
                  <Badge
                    key={industry}
                    variant={filters.industries.includes(industry) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("industries", industry)}
                  >
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Company Size */}
            <div>
              <Label>{t('search.companySize')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {companySizes.map((size) => (
                  <Badge
                    key={size}
                    variant={filters.companySize.includes(size) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("companySize", size)}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {size} {t('search.employees')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <Label>{t('search.requiredSkills')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {commonSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant={filters.skills.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("skills", skill)}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <Label>Benefits</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {benefits.map((benefit) => (
                  <Badge
                    key={benefit}
                    variant={filters.benefits.includes(benefit) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("benefits", benefit)}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Posted Within */}
            <div>
              <Label htmlFor="posted-within">{t('search.postedWithin')}</Label>
              <Select value={filters.postedWithin} onValueChange={(value) => handleFilterChange("postedWithin", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('search.last24Hours')}</SelectItem>
                  <SelectItem value="3">{t('search.last3Days')}</SelectItem>
                  <SelectItem value="7">{t('search.lastWeek')}</SelectItem>
                  <SelectItem value="14">{t('search.last2Weeks')}</SelectItem>
                  <SelectItem value="30">{t('search.lastMonth')}</SelectItem>
                  <SelectItem value="90">{t('search.last3Months')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-6 border-t-2 border-gray-100">
          <Button
            onClick={handleSearch}
            className="flex-1 h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <Search className="h-5 w-5 mr-2" />
            {t('search.searchJobs')}
          </Button>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="h-14 px-8 text-lg font-semibold border-2 border-gray-300 hover:bg-gray-50 rounded-lg bg-transparent"
          >
            {t('contractors.clearFilters')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
