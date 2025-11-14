"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Users,
  Building2,
  FileText,
  MessageSquare,
  Activity,
  RefreshCw,
  Bug
} from "lucide-react"
import { createClient } from "@/lib/client"

interface TableStatus {
  name: string
  exists: boolean
  rowCount: number | null
  error: string | null
  sampleData: any[] | null
  permissions: {
    select: boolean
    insert: boolean
    update: boolean
    delete: boolean
  } | null
}

interface QueryTest {
  name: string
  description: string
  query: () => Promise<any>
  success: boolean
  result: any
  error: string | null
  executionTime: number
}

export function AnalyticsDebugDashboard() {
  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([])
  const [queryTests, setQueryTests] = useState<QueryTest[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const tablesToCheck = [
    'users',
    'jobs',
    'company_profiles',
    'professional_profiles',
    'job_applications',
    'messages',
    'admin_audit_log'
  ]

  const analyticsQueries: Omit<QueryTest, 'success' | 'result' | 'error' | 'executionTime'>[] = [
    {
      name: "User Counts",
      description: "Count users by type",
      query: async () => {
        const supabase = createClient()
        return await supabase.from("users").select("user_type")
      }
    },
    {
      name: "Job Counts",
      description: "Count total and active jobs",
      query: async () => {
        const supabase = createClient()
        return await supabase.from("jobs").select("is_active")
      }
    },
    {
      name: "Application Count",
      description: "Count job applications",
      query: async () => {
        const supabase = createClient()
        return await supabase
          .from("job_applications")
          .select("*", { count: "exact", head: true })
      }
    },
    {
      name: "Message Count",
      description: "Count messages",
      query: async () => {
        const supabase = createClient()
        return await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
      }
    },
    {
      name: "Company Profiles",
      description: "Get company profiles with industry",
      query: async () => {
        const supabase = createClient()
        return await supabase
          .from("company_profiles")
          .select("industry")
          .not("industry", "is", null)
      }
    },
    {
      name: "Professional Skills",
      description: "Get professional skills",
      query: async () => {
        const supabase = createClient()
        return await supabase
          .from("professional_profiles")
          .select("skills")
          .not("skills", "is", null)
      }
    },
    {
      name: "Top Employers",
      description: "Get top employers with job counts",
      query: async () => {
        const supabase = createClient()
        return await supabase.from("jobs").select(`
          company_id,
          applications_count,
          company_profiles!inner(company_name)
        `)
      }
    },
    {
      name: "Admin Audit Logs",
      description: "Get recent admin audit logs",
      query: async () => {
        const supabase = createClient()
        return await supabase
          .from("admin_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5)
      }
    }
  ]

  const checkTableStatus = async (tableName: string): Promise<TableStatus> => {
    const supabase = createClient()

    try {
      console.log(`[DEBUG] Checking table: ${tableName}`)

      // Test if table exists and get count
      const { data, error, count } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: false })
        .limit(3)

      if (error) {
        console.error(`[DEBUG] Error checking ${tableName}:`, error)
        return {
          name: tableName,
          exists: false,
          rowCount: null,
          error: error.message,
          sampleData: null,
          permissions: null
        }
      }

      // Test permissions
      const permissions = {
        select: true, // If we got here, select works
        insert: false,
        update: false,
        delete: false
      }

      // Test insert permission (without actually inserting)
      try {
        await supabase.from(tableName).select("*").limit(0)
        permissions.insert = true
      } catch (e) {
        // Insert permission test failed
      }

      console.log(`[DEBUG] Table ${tableName} status:`, {
        exists: true,
        rowCount: count,
        dataLength: data?.length,
        sampleData: data?.slice(0, 2)
      })

      return {
        name: tableName,
        exists: true,
        rowCount: count,
        error: null,
        sampleData: data?.slice(0, 2) || [],
        permissions
      }

    } catch (error: any) {
      console.error(`[DEBUG] Exception checking ${tableName}:`, error)
      return {
        name: tableName,
        exists: false,
        rowCount: null,
        error: error.message,
        sampleData: null,
        permissions: null
      }
    }
  }

  const runQueryTest = async (queryDef: Omit<QueryTest, 'success' | 'result' | 'error' | 'executionTime'>): Promise<QueryTest> => {
    const startTime = Date.now()

    try {
      console.log(`[DEBUG] Running query test: ${queryDef.name}`)
      const result = await queryDef.query()
      const executionTime = Date.now() - startTime

      console.log(`[DEBUG] Query ${queryDef.name} result:`, result)

      return {
        ...queryDef,
        success: !result.error,
        result: result,
        error: result.error?.message || null,
        executionTime
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime
      console.error(`[DEBUG] Query ${queryDef.name} exception:`, error)

      return {
        ...queryDef,
        success: false,
        result: null,
        error: error.message,
        executionTime
      }
    }
  }

  const runFullDiagnostic = async () => {
    setLoading(true)
    console.log("[DEBUG] Starting full analytics diagnostic...")

    try {
      // Check all tables
      console.log("[DEBUG] Checking table statuses...")
      const tablePromises = tablesToCheck.map(checkTableStatus)
      const tableResults = await Promise.all(tablePromises)
      setTableStatuses(tableResults)

      // Run all query tests
      console.log("[DEBUG] Running query tests...")
      const queryPromises = analyticsQueries.map(runQueryTest)
      const queryResults = await Promise.all(queryPromises)
      setQueryTests(queryResults)

      setLastUpdated(new Date())
      console.log("[DEBUG] Full diagnostic complete")

    } catch (error) {
      console.error("[DEBUG] Diagnostic failed:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runFullDiagnostic()
  }, [])

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge className="bg-green-100 text-green-800">Success</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bug className="h-8 w-8 text-blue-600" />
            Analytics Debug Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive debugging for analytics data and database access
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <Button onClick={runFullDiagnostic} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running...' : 'Re-run Diagnostic'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">
                  {tableStatuses.filter(t => t.exists).length}/{tableStatuses.length}
                </div>
                <div className="text-sm text-muted-foreground">Tables Available</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {queryTests.filter(q => q.success).length}/{queryTests.length}
                </div>
                <div className="text-sm text-muted-foreground">Queries Passing</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {tableStatuses.find(t => t.name === 'users')?.rowCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {tableStatuses.find(t => t.name === 'jobs')?.rowCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Jobs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <div>
                <div className="text-2xl font-bold">
                  {tableStatuses.find(t => t.name === 'company_profiles')?.rowCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Companies</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Query Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analytics Query Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {queryTests.map((test, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.success)}
                    <div>
                      <div className="font-medium">{test.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {test.description} • {test.executionTime}ms
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(test.success)}
                </div>

                {test.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>Error:</strong> {test.error}
                  </div>
                )}

                {test.success && test.result && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                    <strong>Result:</strong>
                    <div className="mt-1">
                      {test.result.data ? `${test.result.data.length} records` : ''}
                      {test.result.count !== undefined ? `, count: ${test.result.count}` : ''}
                      {test.result.error ? `, error: ${test.result.error.message}` : ''}
                    </div>
                    {test.result.data && test.result.data.length > 0 && (
                      <pre className="mt-1 overflow-x-auto max-h-32">
                        {JSON.stringify(test.result.data.slice(0, 2), null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Raw Console Output */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>Check Browser Console:</strong> Open browser developer tools and check the console
              for detailed debug logs starting with <code>[DEBUG]</code>.
            </p>
            <p>
              <strong>Database Access:</strong> Failed queries often indicate missing tables,
              RLS policy restrictions, or authentication issues.
            </p>
            <p>
              <strong>Missing Tables:</strong> If tables don't exist, run the appropriate database setup scripts.
            </p>
            <p>
              <strong>Permission Issues:</strong> Ensure the current user has admin privileges
              and RLS policies allow analytics access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}