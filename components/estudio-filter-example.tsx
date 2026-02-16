// Example usage of EstudioFilter component
// This file demonstrates how to integrate the EstudioFilter into a dashboard

'use client';

import { useState, useEffect } from 'react';
import { EstudioFilter } from './estudio-filter';

type EstudioData = {
  id: number;
  name: string;
  grouper_count: number;
  created_at: string;
  updated_at: string;
};

export function EstudioFilterExample() {
  const [allEstudios, setAllEstudios] = useState<EstudioData[]>([]);
  const [selectedEstudio, setSelectedEstudio] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch estudios data
  const fetchEstudios = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/estudios');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      setAllEstudios(data);

      // Auto-select first estudio if none selected and estudios are available
      if (selectedEstudio === null && data.length > 0) {
        setSelectedEstudio(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching estudios:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Error al cargar los estudios';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstudios();
  }, []);

  const handleSelectionChange = (selected: number | null) => {
    setSelectedEstudio(selected);

    // Here you would typically:
    // 1. Update the dashboard with filtered data
    // 2. Make API calls with the selected estudio ID
    // 3. Update other components that depend on the filter

    console.log('Selected estudio:', selected);
  };

  const handleRetry = () => {
    fetchEstudios();
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Dashboard Agrupadores</h2>

      <div className="flex items-center gap-4">
        <EstudioFilter
          allEstudios={allEstudios}
          selectedEstudio={selectedEstudio}
          onSelectionChange={handleSelectionChange}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
        />

        {/* Other filter controls would go here */}
      </div>

      {/* Chart components would go here */}
      <div className="mt-6 rounded-lg border p-4">
        <h3 className="mb-2 font-medium">Selected Estudio:</h3>
        {selectedEstudio === null ? (
          <p className="text-muted-foreground">No estudio selected</p>
        ) : (
          <div className="space-y-1">
            {(() => {
              const selectedEstudioData = allEstudios.find(
                (e) => e.id === selectedEstudio
              );
              return selectedEstudioData ? (
                <div className="text-sm">
                  <p>
                    <strong>Name:</strong> {selectedEstudioData.name}
                  </p>
                  <p>
                    <strong>Groupers:</strong>{' '}
                    {selectedEstudioData.grouper_count}
                  </p>
                  <p>
                    <strong>ID:</strong> {selectedEstudioData.id}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Estudio not found (ID: {selectedEstudio})
                </p>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
