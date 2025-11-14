"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, Eye } from "lucide-react"

interface Payment {
  id: string
  user: string
  email: string
  amount: number
  status: "completed" | "pending" | "failed" | "refunded"
  type: "subscription" | "job_posting" | "premium_feature"
  date: string
  transactionId: string
}

interface PaymentsTableProps {
  adminRole: string
}

export function PaymentsTable({ adminRole }: PaymentsTableProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  useEffect(() => {
    // Mock data - in real app, this would fetch from API
    const mockPayments: Payment[] = [
      {
        id: "1",
        user: "John Doe",
        email: "john.doe@example.com",
        amount: 99.99,
        status: "completed",
        type: "subscription",
        date: "2024-01-15T10:30:00Z",
        transactionId: "txn_1234567890",
      },
      {
        id: "2",
        user: "Jane Smith",
        email: "jane.smith@example.com",
        amount: 49.99,
        status: "completed",
        type: "job_posting",
        date: "2024-01-14T15:45:00Z",
        transactionId: "txn_0987654321",
      },
      {
        id: "3",
        user: "Mike Wilson",
        email: "mike.wilson@example.com",
        amount: 29.99,
        status: "pending",
        type: "premium_feature",
        date: "2024-01-13T09:15:00Z",
        transactionId: "txn_1122334455",
      },
      {
        id: "4",
        user: "Sarah Jones",
        email: "sarah.jones@example.com",
        amount: 99.99,
        status: "failed",
        type: "subscription",
        date: "2024-01-12T14:20:00Z",
        transactionId: "txn_5566778899",
      },
      {
        id: "5",
        user: "David Brown",
        email: "david.brown@example.com",
        amount: 49.99,
        status: "refunded",
        type: "job_posting",
        date: "2024-01-11T11:30:00Z",
        transactionId: "txn_9988776655",
      },
    ]
    setPayments(mockPayments)
  }, [])

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter
    const matchesType = typeFilter === "all" || payment.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: Payment["status"]) => {
    const variants = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
      refunded: "outline",
    } as const

    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
  }

  const getTypeBadge = (type: Payment["type"]) => {
    const labels = {
      subscription: "Subscription",
      job_posting: "Job Posting",
      premium_feature: "Premium Feature",
    }

    return <Badge variant="outline">{labels[type]}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Transactions</span>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardTitle>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, email, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="job_posting">Job Posting</SelectItem>
              <SelectItem value="premium_feature">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.user}</div>
                      <div className="text-sm text-muted-foreground">{payment.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>{getTypeBadge(payment.type)}</TableCell>
                  <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-sm">{payment.transactionId}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No payments found matching your criteria.</div>
        )}
      </CardContent>
    </Card>
  )
}
