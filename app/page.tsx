import { DashboardView } from "@/components/dashboard-view"
import { ProtectedRoute } from "@/components/protected-route"

export default function Home() {
  return (
    <ProtectedRoute>
      <DashboardView />
    </ProtectedRoute>
  )
}
