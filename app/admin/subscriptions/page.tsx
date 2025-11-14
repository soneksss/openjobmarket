"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Building2,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Crown,
  DollarSign
} from "lucide-react"
import { createClient } from "@/lib/client"

interface SubscriptionPlan {
  id: string
  name: string
  user_type: 'company' | 'professional'
  price: number
  duration_days: number
  job_limit: number | null
  contact_limit: number | null
  features: Record<string, any>
  active: boolean
  created_at: string
}

interface NewPlan {
  name: string
  user_type: 'company' | 'professional'
  price: number
  duration_days: number
  job_limit: number | null
  contact_limit: number | null
  features: Record<string, any>
}

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [showNewPlanForm, setShowNewPlanForm] = useState(false)

  const [newPlan, setNewPlan] = useState<NewPlan>({
    name: '',
    user_type: 'company',
    price: 0,
    duration_days: 30,
    job_limit: null,
    contact_limit: null,
    features: {}
  })

  const supabase = createClient()

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("user_type", { ascending: true })
        .order("price", { ascending: true })

      if (error) {
        console.error("Error loading plans:", error)
        setError("Failed to load subscription plans")
      } else {
        setPlans(data || [])
      }
    } catch (err) {
      console.error("Exception loading plans:", err)
      setError("Failed to load subscription plans")
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async () => {
    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from("subscription_plans")
        .insert(newPlan)

      if (error) {
        console.error("Error creating plan:", error)
        setError("Failed to create subscription plan")
        return
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      setNewPlan({
        name: '',
        user_type: 'company',
        price: 0,
        duration_days: 30,
        job_limit: null,
        contact_limit: null,
        features: {}
      })
      setShowNewPlanForm(false)

      await loadPlans()
    } catch (err) {
      console.error("Exception creating plan:", err)
      setError("Failed to create subscription plan")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePlan = async (plan: SubscriptionPlan) => {
    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name: plan.name,
          price: plan.price,
          duration_days: plan.duration_days,
          job_limit: plan.job_limit,
          contact_limit: plan.contact_limit,
          features: plan.features,
          active: plan.active
        })
        .eq("id", plan.id)

      if (error) {
        console.error("Error updating plan:", error)
        setError("Failed to update subscription plan")
        return
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      setEditingPlan(null)

      await loadPlans()
    } catch (err) {
      console.error("Exception updating plan:", err)
      setError("Failed to update subscription plan")
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", planId)

      if (error) {
        console.error("Error deleting plan:", error)
        setError("Failed to delete subscription plan")
        return
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      await loadPlans()
    } catch (err) {
      console.error("Exception deleting plan:", err)
      setError("Failed to delete subscription plan")
    } finally {
      setSaving(false)
    }
  }

  const formatDuration = (days: number) => {
    if (days === 1) return "1 day"
    if (days === 7) return "1 week"
    if (days === 30) return "1 month"
    if (days < 7) return `${days} days`
    if (days < 30) return `${Math.floor(days / 7)} weeks`
    return `${Math.floor(days / 30)} months`
  }

  const companyPlans = plans.filter(p => p.user_type === 'company')
  const professionalPlans = plans.filter(p => p.user_type === 'professional')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-8 w-8 text-muted-foreground animate-spin" />
          <div>
            <h1 className="text-3xl font-bold">Subscription Plans</h1>
            <p className="text-muted-foreground">Loading subscription plans...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Crown className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Subscription Plans</h1>
            <p className="text-muted-foreground">Manage pricing and features for subscription tiers</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {saveSuccess && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="h-4 w-4 mr-1" />
              Changes saved successfully
            </div>
          )}
          <Button onClick={() => setShowNewPlanForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Plan
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Company Subscription Plans</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {companyPlans.map((plan) => (
              <Card key={plan.id} className={`${plan.active ? 'border-blue-200' : 'border-gray-200 opacity-60'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge variant={plan.active ? "default" : "secondary"}>
                      {plan.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    £{plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{formatDuration(plan.duration_days)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Job Postings:</span>
                      <span className="font-medium">
                        {plan.job_limit ? plan.job_limit : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Professional Contacts:</span>
                      <span className="font-medium">
                        {plan.contact_limit ? plan.contact_limit : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{formatDuration(plan.duration_days)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPlan(plan)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Subscription Plan</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the "{plan.name}" plan? This action cannot be undone.
                            Users with active subscriptions to this plan will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePlan(plan.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Plan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Professional Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Professional Subscription Plans</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {professionalPlans.map((plan) => (
              <Card key={plan.id} className={`${plan.active ? 'border-green-200' : 'border-gray-200 opacity-60'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge variant={plan.active ? "default" : "secondary"}>
                      {plan.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    £{plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{formatDuration(plan.duration_days)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{formatDuration(plan.duration_days)}</span>
                    </div>
                    {plan.features?.actively_looking && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span className="text-xs">Actively Looking Toggle</span>
                      </div>
                    )}
                    {plan.features?.bold_profile && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span className="text-xs">Bold Profile Name</span>
                      </div>
                    )}
                    {plan.features?.green_indicator && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span className="text-xs">Green Dot Indicator</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPlan(plan)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Subscription Plan</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the "{plan.name}" plan? This action cannot be undone.
                            Users with active subscriptions to this plan will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePlan(plan.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Plan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Plan Form Modal */}
      {showNewPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Subscription Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Plan Name</Label>
                <Input
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                  placeholder="e.g., Premium"
                />
              </div>

              <div>
                <Label>User Type</Label>
                <Select
                  value={newPlan.user_type}
                  onValueChange={(value: 'company' | 'professional') =>
                    setNewPlan({...newPlan, user_type: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Price (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({...newPlan, price: Number(e.target.value)})}
                />
              </div>

              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={newPlan.duration_days}
                  onChange={(e) => setNewPlan({...newPlan, duration_days: Number(e.target.value)})}
                />
              </div>

              {newPlan.user_type === 'company' && (
                <>
                  <div>
                    <Label>Job Posting Limit (leave empty for unlimited)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newPlan.job_limit || ''}
                      onChange={(e) => setNewPlan({
                        ...newPlan,
                        job_limit: e.target.value ? Number(e.target.value) : null
                      })}
                    />
                  </div>

                  <div>
                    <Label>Contact Limit (leave empty for unlimited)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newPlan.contact_limit || ''}
                      onChange={(e) => setNewPlan({
                        ...newPlan,
                        contact_limit: e.target.value ? Number(e.target.value) : null
                      })}
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewPlanForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePlan}
                  disabled={saving || !newPlan.name}
                  className="flex-1"
                >
                  {saving ? "Creating..." : "Create Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Subscription Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Plan Name</Label>
                <Input
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                />
              </div>

              <div>
                <Label>Price (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({...editingPlan, price: Number(e.target.value)})}
                />
              </div>

              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingPlan.duration_days}
                  onChange={(e) => setEditingPlan({...editingPlan, duration_days: Number(e.target.value)})}
                />
              </div>

              {editingPlan.user_type === 'company' && (
                <>
                  <div>
                    <Label>Job Posting Limit (leave empty for unlimited)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editingPlan.job_limit || ''}
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        job_limit: e.target.value ? Number(e.target.value) : null
                      })}
                    />
                  </div>

                  <div>
                    <Label>Contact Limit (leave empty for unlimited)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editingPlan.contact_limit || ''}
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        contact_limit: e.target.value ? Number(e.target.value) : null
                      })}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingPlan.active}
                  onCheckedChange={(checked) => setEditingPlan({...editingPlan, active: checked})}
                />
                <Label>Plan Active</Label>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdatePlan(editingPlan)}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}