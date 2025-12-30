"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/client"
import { BarChart3 } from "lucide-react"

interface ReasonCount {
  reason: string
  count: number
  percentage: number
}

export function DeletionReasonChart() {
  const [reasonCounts, setReasonCounts] = useState<ReasonCount[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    fetchReasonCounts()
  }, [])

  async function fetchReasonCounts() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('account_deletion_reasons')
        .select('primary_reason')

      if (error) {
        console.error('Error fetching reason counts:', error)
        return
      }

      // Count occurrences of each reason
      const reasonMap = new Map<string, number>()
      data?.forEach((row) => {
        const count = reasonMap.get(row.primary_reason) || 0
        reasonMap.set(row.primary_reason, count + 1)
      })

      const totalCount = data?.length || 0
      setTotal(totalCount)

      // Convert to array and calculate percentages
      const counts: ReasonCount[] = Array.from(reasonMap.entries())
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)

      setReasonCounts(counts)
    } catch (error) {
      console.error('Error fetching reason counts:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatReason(reason: string) {
    return reason
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  function getBarColor(index: number) {
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-green-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-teal-500',
    ]
    return colors[index % colors.length]
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Deletion Reasons Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-48 bg-zinc-700 rounded animate-pulse" />
                <div className="h-8 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : reasonCounts.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No deletion data available yet
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-zinc-400">
              Total deletions: <span className="text-white font-semibold">{total}</span>
            </div>

            <div className="space-y-4">
              {reasonCounts.map((item, index) => (
                <div key={item.reason} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300 font-medium">{formatReason(item.reason)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400">{item.count} deletions</span>
                      <span className="text-white font-semibold w-12 text-right">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${getBarColor(index)} transition-all duration-500 ease-out`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Top 3 Reasons Summary */}
            {reasonCounts.length > 0 && (
              <div className="mt-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-3">Top 3 Reasons</h4>
                <div className="space-y-2">
                  {reasonCounts.slice(0, 3).map((item, index) => (
                    <div key={item.reason} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        {index + 1}. {formatReason(item.reason)}
                      </span>
                      <span className="text-zinc-300 font-medium">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
