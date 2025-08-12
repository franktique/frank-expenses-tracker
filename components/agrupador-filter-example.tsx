// Example usage of AgrupadorFilter component
// This file demonstrates how to integrate the AgrupadorFilter into a dashboard

"use client";

import { useState, useEffect } from "react";
import { AgrupadorFilter } from "./agrupador-filter";

type GrouperData = {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
};

export function AgrupadorFilterExample() {
  const [allGroupers, setAllGroupers] = useState<GrouperData[]>([]);
  const [selectedGroupers, setSelectedGroupers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Projection fetching groupers data
  useEffect(() => {
    const fetchGroupers = async () => {
      setIsLoading(true);

      // Projection API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockData: GrouperData[] = [
        { grouper_id: 1, grouper_name: "Alimentación", total_amount: 1500 },
        { grouper_id: 2, grouper_name: "Transporte", total_amount: 800 },
        { grouper_id: 3, grouper_name: "Entretenimiento", total_amount: 400 },
        { grouper_id: 4, grouper_name: "Salud", total_amount: 600 },
        { grouper_id: 5, grouper_name: "Educación", total_amount: 300 },
      ];

      setAllGroupers(mockData);
      // Initially select all groupers
      setSelectedGroupers(mockData.map((g) => g.grouper_id));
      setIsLoading(false);
    };

    fetchGroupers();
  }, []);

  const handleSelectionChange = (selected: number[]) => {
    setSelectedGroupers(selected);

    // Here you would typically:
    // 1. Update the charts with filtered data
    // 2. Make API calls with the selected grouper IDs
    // 3. Update other components that depend on the filter

    console.log("Selected groupers:", selected);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Dashboard Agrupadores</h2>

      <div className="flex items-center gap-4">
        <AgrupadorFilter
          allGroupers={allGroupers}
          selectedGroupers={selectedGroupers}
          onSelectionChange={handleSelectionChange}
          isLoading={isLoading}
        />

        {/* Other filter controls would go here */}
      </div>

      {/* Chart components would go here */}
      <div className="mt-6 p-4 border rounded-lg">
        <h3 className="font-medium mb-2">Selected Groupers:</h3>
        {selectedGroupers.length === 0 ? (
          <p className="text-muted-foreground">No groupers selected</p>
        ) : selectedGroupers.length === allGroupers.length ? (
          <p className="text-muted-foreground">All groupers selected</p>
        ) : (
          <ul className="space-y-1">
            {allGroupers
              .filter((g) => selectedGroupers.includes(g.grouper_id))
              .map((grouper) => (
                <li key={grouper.grouper_id} className="text-sm">
                  {grouper.grouper_name}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
