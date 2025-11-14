import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Eye, AlertTriangle } from "lucide-react"

export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <Shield className="h-8 w-8 mr-3 text-green-600" />
            Security & Trust
          </CardTitle>
          <p className="text-muted-foreground">Learn about our security measures and how we protect your data</p>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-green-600" />
                  Data Encryption
                </CardTitle>
                <Badge variant="secondary" className="w-fit">
                  Active
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All data is encrypted in transit and at rest using industry-standard AES-256 encryption to protect
                  your information.
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-green-600" />
                  Privacy Controls
                </CardTitle>
                <Badge variant="secondary" className="w-fit">
                  Configurable
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Granular privacy controls let you decide who can see your profile, contact information, and job
                  application history.
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Security Features</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-medium">Secure Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    Multi-factor authentication and secure password requirements
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-medium">Regular Security Audits</h3>
                  <p className="text-sm text-muted-foreground">
                    Third-party security assessments and vulnerability testing
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-medium">GDPR Compliance</h3>
                  <p className="text-sm text-muted-foreground">
                    Full compliance with European data protection regulations
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Report Security Issues</h3>
                <p className="text-sm text-amber-700 mt-1">
                  If you discover a security vulnerability, please report it to security@openjobmarket.com. We take all
                  reports seriously and will respond within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
