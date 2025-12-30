"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/client"
import { Download, Filter, Search } from "lucide-react"
import { format } from "date-fns"

interface DeletionRecord {
  id: string
  user_email: string
  user_role: string
  primary_reason: string
  custom_message: string | null
  country: string
  locale: string
  created_at: string
  days_as_member: number
}

export function DeletionAnalyticsTable() {
  const [records, setRecords] = useState<DeletionRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<DeletionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [reasonFilter, setReasonFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const supabase = createClient()

  useEffect(() => {
    fetchRecords()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [records, searchTerm, reasonFilter, roleFilter, dateFrom, dateTo])

  async function fetchRecords() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('account_deletion_reasons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching deletion records:', error)
        return
      }

      setRecords(data || [])
    } catch (error) {
      console.error('Error fetching deletion records:', error)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...records]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.custom_message?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Reason filter
    if (reasonFilter && reasonFilter !== "all") {
      filtered = filtered.filter((record) => record.primary_reason === reasonFilter)
    }

    // Role filter
    if (roleFilter && roleFilter !== "all") {
      filtered = filtered.filter((record) => record.user_role === roleFilter)
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter((record) => new Date(record.created_at) >= new Date(dateFrom))
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((record) => new Date(record.created_at) <= toDate)
    }

    setFilteredRecords(filtered)
  }

  function handleExport() {
    // Convert to CSV
    const headers = ['Email', 'Role', 'Reason', 'Message', 'Country', 'Locale', 'Days as Member', 'Deleted At']
    const rows = filteredRecords.map((record) => [
      record.user_email,
      record.user_role,
      record.primary_reason,
      record.custom_message || '',
      record.country,
      record.locale,
      record.days_as_member,
      format(new Date(record.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deletion-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  function formatReason(reason: string) {
    return reason
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const deletionReasons = [
    'cant_find_what_looking_for',
    'not_enough_users',
    'too_complicated',
    'poor_ux',
    'trust_safety_concerns',
    'found_alternative',
    'temporary_use',
    'technical_issues',
    'privacy_concerns',
    'other',
  ]

  const userRoles = ['company', 'jobseeker', 'homeowner', 'tradespeople', 'unknown']

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Deletion Records</CardTitle>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-zinc-400 text-xs">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="search"
                  placeholder="Email or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-zinc-400 text-xs">
                Reason
              </Label>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="All reasons" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All reasons</SelectItem>
                  {deletionReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {formatReason(reason)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-zinc-400 text-xs">
                User Role
              </Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All roles</SelectItem>
                  {userRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFrom" className="text-zinc-400 text-xs">
                From Date
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo" className="text-zinc-400 text-xs">
                To Date
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          {(searchTerm || reasonFilter !== "all" || roleFilter !== "all" || dateFrom || dateTo) && (
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                Showing {filteredRecords.length} of {records.length} records
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setReasonFilter("all")
                  setRoleFilter("all")
                  setDateFrom("")
                  setDateTo("")
                }}
                className="text-zinc-400 hover:text-white"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-800 border-zinc-700 hover:bg-zinc-800">
                <TableHead className="text-zinc-300">Email</TableHead>
                <TableHead className="text-zinc-300">Role</TableHead>
                <TableHead className="text-zinc-300">Reason</TableHead>
                <TableHead className="text-zinc-300">Custom Message</TableHead>
                <TableHead className="text-zinc-300">Days as Member</TableHead>
                <TableHead className="text-zinc-300">Deleted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="text-white font-mono text-sm">
                      {record.user_email}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {record.user_role?.charAt(0).toUpperCase() + record.user_role?.slice(1)}
                    </TableCell>
                    <TableCell className="text-zinc-300">{formatReason(record.primary_reason)}</TableCell>
                    <TableCell className="text-zinc-400 max-w-xs truncate">
                      {record.custom_message || '-'}
                    </TableCell>
                    <TableCell className="text-zinc-300">{record.days_as_member}</TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {format(new Date(record.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
