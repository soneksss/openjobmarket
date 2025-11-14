# Contractor Full-Screen Map Code to Add

## Summary
✅ Jobs page - COMPLETE with full-screen mode and mobile list/map toggle
⏳ Contractors page - Need to add full-screen section

## Code Already Added to Contractors:
- ✅ Imports for Tabs, List, Maximize icons
- ✅ State variables: `isFullScreenMode` and `activeView`

## What's Left:

### 1. Add Full Screen Button
Find the ContractorMap component in contractor-map-view.tsx (around line 250-300) and add a Full Screen button overlay similar to jobs.

### 2. Add Full-Screen Section
Add this BEFORE the final `</div>` closing tag (before line 688):

```typescript
{/* Full-Screen Map Mode */}
{isFullScreenMode && (
  <div className="fixed inset-0 z-50 bg-white flex flex-col">
    {/* Top Search Bar */}
    <div className="sticky top-0 z-20 bg-white shadow-lg border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. Plumber, Electrician, Builder"
            className="h-12 flex-1 bg-white/95 shadow-lg border-2 font-medium text-base"
          />
          <div className="flex-1 flex gap-2">
            <div className="flex-1">
              <LocationInput
                value={locationFilter}
                onChange={setLocationFilter}
                onLocationSelect={handleLocationSelect}
                placeholder="e.g. London, Manchester"
                error=""
                className="h-12 bg-white/95 shadow-lg border-2 text-base"
              />
            </div>
            <Button
              onClick={handleMapPickerClick}
              className="h-12 px-3 bg-blue-500 hover:bg-blue-600 shadow-lg"
              title="Pick location on map"
            >
              <Map className="h-5 w-5" />
            </Button>
          </div>
          <Button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            variant="outline"
            className="h-12 px-4 bg-white shadow-lg"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            onClick={handleSearch}
            className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg font-semibold"
          >
            <Search className="mr-2 h-5 w-5" />
            Search
          </Button>
          <Button
            onClick={() => {
              setIsFullScreenMode(false)
              router.push('/contractors')
            }}
            variant="outline"
            className="h-12 px-3 bg-white shadow-lg"
            title="Exit full-screen"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-3 p-4 bg-white rounded-lg shadow-md border-2 border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-gray-900 text-sm font-semibold mb-2">Skills</label>
                <Input
                  placeholder="e.g. Plumbing, Electric"
                  value={skillsFilter}
                  onChange={(e) => setSkillsFilter(e.target.value)}
                  className="h-10 text-sm bg-white font-medium"
                />
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <label className="block text-gray-900 text-sm font-semibold mb-2">Language</label>
                <Input
                  placeholder="English, Spanish"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="h-10 text-sm bg-white font-medium"
                />
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <label className="block text-gray-900 text-sm font-semibold mb-2">Search Radius</label>
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger className="w-full h-10 text-sm bg-white font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30, 40, 50].map((miles) => (
                      <SelectItem key={miles} value={miles.toString()}>
                        {miles} miles
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Main Content: Map + Sidebar */}
    <div className="flex-1 flex overflow-hidden">
      {/* Map Section */}
      <div className={`flex-1 relative ${activeView === "list" ? "hidden md:block" : ""}`}>
        <ContractorMap
          contractors={contractors.filter(c => c.latitude && c.longitude).map(contractor => ({
            id: contractor.id,
            name: contractor.display_name,
            type: contractor.type,
            location: contractor.location,
            coordinates: { lat: contractor.latitude!, lon: contractor.longitude! },
            photo_url: contractor.photo_url,
          }))}
          center={center}
          zoom={10}
          height="100%"
          onContractorClick={(id) => {
            const contractor = contractors.find(c => c.id === id)
            if (contractor) setSelectedContractor(contractor)
          }}
        />

        {/* Results Counter */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white rounded-lg shadow-lg p-3 border">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-lg">
                {contractors.length} Contractor{contractors.length !== 1 ? "s" : ""} Found
              </span>
            </div>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="md:hidden absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "map")} className="w-auto">
            <TabsList className="bg-white shadow-lg border-2">
              <TabsTrigger value="map" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Map className="h-4 w-4 mr-2" />
                Map
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Right Sidebar - Contractor List */}
      <div className={`w-full md:w-[400px] bg-white border-l shadow-xl flex flex-col ${activeView === "map" ? "hidden md:flex" : ""}`}>
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-lg">
            {selectedContractor ? "Contractor Details" : "Contractors"}
          </h3>
          <p className="text-sm text-gray-600">
            {selectedContractor ? "Complete contractor information" : `${contractors.length} contractor${contractors.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedContractor ? (
            /* Contractor Details */
            <div className="p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedContractor(null)}
                className="mb-3"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
              <div className="space-y-4">
                <div className="text-center">
                  <Avatar className="h-20 w-20 mx-auto mb-3">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                      {selectedContractor.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold mb-2">{selectedContractor.display_name}</h2>
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedContractor.location}</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-center">
                  <Badge>{selectedContractor.type}</Badge>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-gray-600">{selectedContractor.description || "No description available"}</p>
                </div>
                {selectedContractor.skills && selectedContractor.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedContractor.skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button asChild className="w-full">
                  <Link href={selectedContractor.type === 'professional'
                    ? `/professionals/${selectedContractor.user_id}`
                    : `/companies/${selectedContractor.user_id}`}>
                    View Full Profile
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Contractor List */
            <div>
              {contractors.map((contractor) => (
                <div
                  key={contractor.id}
                  className="p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedContractor(contractor)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold">
                        {contractor.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1">{contractor.display_name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <MapPin className="h-3 w-3" />
                        {contractor.location}
                      </div>
                      <Badge variant="outline" className="text-xs">{contractor.type}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile View Toggle (Bottom) */}
        <div className="md:hidden p-3 border-t bg-gray-50">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "map")} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="map" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Map className="h-4 w-4 mr-2" />
                Map
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
)}
```

This is a HUGE block of code. The implementation is complete in the jobs page. For contractors, you need to:

1. Find where ContractorMap is rendered in the normal view
2. Add a Full Screen button there (same as jobs)
3. Add the full-screen section above before the closing `</div>` tags

The code is ready - just needs to be inserted in the right place!
