"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Users, Building2, Shield } from "lucide-react"

interface AdminSettingsPanelProps {
  adminRole: string
}

export function AdminSettingsPanel({ adminRole }: AdminSettingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Admin Settings
          <Badge variant="secondary">{adminRole}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Users className="h-4 w-4" />
            Manage Users
          </Button>
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Building2 className="h-4 w-4" />
            Manage Companies
          </Button>
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Shield className="h-4 w-4" />
            Security Settings
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">
              Export Data
            </Button>
            <Button size="sm" variant="secondary">
              System Backup
            </Button>
            <Button size="sm" variant="secondary">
              View Logs
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
