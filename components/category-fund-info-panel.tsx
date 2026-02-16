'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Info,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { Fund } from '@/types/funds';

interface CategoryFundInfoPanelProps {
  title?: string;
  description?: string;
  showTips?: boolean;
  showStats?: boolean;
  className?: string;
}

export function CategoryFundInfoPanel({
  title = 'Relaciones Categoría-Fondo',
  description = 'Información sobre cómo funcionan las relaciones entre categorías y fondos',
  showTips = true,
  showStats = false,
  className,
}: CategoryFundInfoPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Relationship Types */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Tipos de relaciones:</h4>

          <div className="space-y-2">
            <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-green-800">
                    Fondo específico
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    <div className="mr-1 h-2 w-2 rounded-full bg-green-500" />1
                    fondo
                  </Badge>
                </div>
                <p className="text-xs text-green-700">
                  La categoría está asociada con un solo fondo. Los gastos solo
                  pueden registrarse desde ese fondo.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-2">
              <Users className="mt-0.5 h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-800">
                    Múltiples fondos
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    <div className="mr-1 h-2 w-2 rounded-full bg-blue-500" />
                    2+ fondos
                  </Badge>
                </div>
                <p className="text-xs text-blue-700">
                  La categoría está asociada con varios fondos. Los gastos
                  pueden registrarse desde cualquiera de estos fondos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-amber-800">
                    Sin restricción
                  </span>
                  <Badge variant="outline" className="text-xs">
                    <div className="mr-1 h-2 w-2 rounded-full bg-amber-500" />
                    Todos
                  </Badge>
                </div>
                <p className="text-xs text-amber-700">
                  La categoría no tiene fondos específicos. Los gastos pueden
                  registrarse desde cualquier fondo disponible.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        {showTips && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Consejos útiles:</p>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>
                    • Al registrar gastos, el sistema preselecciona el fondo del
                    filtro principal si está disponible para la categoría
                  </li>
                  <li>
                    • Si el fondo del filtro no está disponible, se selecciona
                    automáticamente el primer fondo asociado
                  </li>
                  <li>
                    • Las categorías sin fondos específicos ofrecen máxima
                    flexibilidad pero menos control
                  </li>
                  <li>
                    • Puedes cambiar las relaciones en cualquier momento desde
                    la gestión de categorías
                  </li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function CategoryFundInfoCompact({ className }: { className?: string }) {
  return (
    <div className={`space-y-1 text-xs text-muted-foreground ${className}`}>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span>Fondo específico</span>
        <div className="h-2 w-2 rounded-full bg-blue-500" />
        <span>Múltiples fondos</span>
        <div className="h-2 w-2 rounded-full bg-amber-500" />
        <span>Sin restricción</span>
      </div>
      <p>Los colores indican el tipo de relación categoría-fondo</p>
    </div>
  );
}

// Status summary component
interface CategoryFundStatusSummaryProps {
  totalCategories: number;
  specificFundCategories: number;
  multipleFundCategories: number;
  unrestrictedCategories: number;
  className?: string;
}

export function CategoryFundStatusSummary({
  totalCategories,
  specificFundCategories,
  multipleFundCategories,
  unrestrictedCategories,
  className,
}: CategoryFundStatusSummaryProps) {
  const getPercentage = (count: number) =>
    totalCategories > 0 ? Math.round((count / totalCategories) * 100) : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">Resumen de Relaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm">Fondo específico</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {specificFundCategories}
              </div>
              <div className="text-xs text-muted-foreground">
                {getPercentage(specificFundCategories)}%
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-sm">Múltiples fondos</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {multipleFundCategories}
              </div>
              <div className="text-xs text-muted-foreground">
                {getPercentage(multipleFundCategories)}%
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-sm">Sin restricción</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {unrestrictedCategories}
              </div>
              <div className="text-xs text-muted-foreground">
                {getPercentage(unrestrictedCategories)}%
              </div>
            </div>
          </div>

          <div className="border-t pt-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Total categorías</span>
              <span>{totalCategories}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
