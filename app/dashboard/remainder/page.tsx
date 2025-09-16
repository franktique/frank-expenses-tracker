import { Metadata } from "next";
import { RemainderDashboard } from "@/components/remainder-dashboard";

export const metadata: Metadata = {
  title: "Dashboard Remanentes | Budget Tracker",
  description: "Dashboard para visualizar categorías con presupuesto disponible",
};

export default function RemainderDashboardPage() {
  return <RemainderDashboard />;
}