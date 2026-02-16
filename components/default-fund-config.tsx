'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Settings, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useBudget } from '@/context/budget-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppSettings } from '@/types/settings';

export function DefaultFundConfig() {
  const { funds, refreshData } = useBudget();
  const { toast } = useToast();
  const [selectedFundId, setSelectedFundId] = useState<string>('');
  const [currentSettings, setCurrentSettings] = useState<AppSettings | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        if (data.success && data.settings) {
          setCurrentSettings(data.settings);
          setSelectedFundId(data.settings.default_fund_id || 'none');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setConfigError('Error al cargar la configuración actual');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSaveDefaultFund = async () => {
    setIsSaving(true);
    setConfigError(null);

    try {
      const fundId = selectedFundId === '' ? null : selectedFundId;

      const response = await fetch('/api/settings', {
        method: currentSettings ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          default_fund_id: fundId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar la configuración');
      }

      setCurrentSettings(data.settings);

      toast({
        title: 'Configuración guardada',
        description:
          'El fondo predeterminado ha sido configurado exitosamente.',
      });

      // Refresh budget context to use new default
      await refreshData();
    } catch (error) {
      setConfigError((error as Error).message);
      toast({
        title: 'Error',
        description: `Error al guardar la configuración: ${
          (error as Error).message
        }`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrentDefaultFundName = () => {
    if (!currentSettings?.default_fund_id) return 'Ninguno';
    const fund = funds.find((f) => f.id === currentSettings.default_fund_id);
    return fund?.name || 'Fondo no encontrado';
  };

  const hasChanges = () => {
    const currentFundId = currentSettings?.default_fund_id || '';
    const selectedValue = selectedFundId === 'none' ? '' : selectedFundId;
    return currentFundId !== selectedValue;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="py-4 text-center">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="default-fund-select">Fondo Predeterminado</Label>
        <Select
          value={selectedFundId || 'none'}
          onValueChange={(value) =>
            setSelectedFundId(value === 'none' ? '' : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un fondo predeterminado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ninguno</SelectItem>
            {funds.map((fund) => (
              <SelectItem key={fund.id} value={fund.id}>
                {fund.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Este fondo se usará por defecto para gastos e ingresos cuando no se
          especifique otro fondo.
        </p>
      </div>

      {currentSettings && (
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>
              <strong>Fondo actual:</strong> {getCurrentDefaultFundName()}
            </span>
          </div>
        </div>
      )}

      {configError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de configuración</AlertTitle>
          <AlertDescription>{configError}</AlertDescription>
        </Alert>
      )}

      {funds.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sin fondos disponibles</AlertTitle>
          <AlertDescription>
            No hay fondos disponibles. Primero debes crear al menos un fondo
            antes de configurar el fondo predeterminado.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSaveDefaultFund}
        disabled={isSaving || !hasChanges() || funds.length === 0}
        className="w-full"
      >
        <Settings className="mr-2 h-4 w-4" />
        {isSaving ? 'Guardando...' : 'Guardar Configuración'}
      </Button>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Acerca del fondo predeterminado</AlertTitle>
        <AlertDescription>
          <p className="text-sm">
            El fondo predeterminado se utilizará automáticamente cuando:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            <li>Se crean gastos sin especificar un fondo de origen</li>
            <li>Se registran ingresos sin especificar un fondo de destino</li>
            <li>
              Se trabaja con categorías que no tienen fondos específicos
              asociados
            </li>
          </ul>
          <p className="mt-2 text-sm">
            Si no se configura un fondo predeterminado, el sistema intentará
            usar un fondo llamado "Disponible" si existe.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
