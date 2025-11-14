"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

const workersData = [
  { month: "Jan", registrations: 45 },
  { month: "Feb", registrations: 52 },
  { month: "Mar", registrations: 48 },
  { month: "Apr", registrations: 61 },
  { month: "May", registrations: 55 },
  { month: "Jun", registrations: 67 },
]

const companiesData = [
  { month: "Jan", registrations: 12 },
  { month: "Feb", registrations: 15 },
  { month: "Mar", registrations: 18 },
  { month: "Apr", registrations: 22 },
  { month: "May", registrations: 19 },
  { month: "Jun", registrations: 25 },
]

export function WorkersRegistrationChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={workersData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="registrations" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function CompaniesRegistrationChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={companiesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="registrations" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
