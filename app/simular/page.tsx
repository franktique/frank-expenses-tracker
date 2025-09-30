"use client";

import { useRouter } from "next/navigation";
import { SimulationList } from "@/components/simulation-list";
import { SimulationNavigation } from "@/components/simulation-navigation";

export default function SimularPage() {
  const router = useRouter();

  const handleSimulationSelect = (simulationId: number) => {
    router.push(`/simular/${simulationId}`);
  };

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Recent simulations navigation */}
      <SimulationNavigation showRecentList={true} maxRecentItems={5} />

      {/* Main simulation list */}
      <SimulationList onSelect={handleSimulationSelect} />
    </div>
  );
}
