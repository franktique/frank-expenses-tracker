'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarRange,
  Plus,
  Play,
  BookOpen,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBudget } from '@/context/budget-context';

interface NoActivePeriodFallbackProps {
  showCompact?: boolean;
  className?: string;
}

export function NoActivePeriodFallback({
  showCompact = false,
  className = '',
}: NoActivePeriodFallbackProps) {
  const router = useRouter();
  const { periods } = useBudget();

  const hasInactivePeriods = periods.some(
    (period) => !period.is_open && !period.isOpen
  );
  const hasNoPeriods = periods.length === 0;

  if (showCompact) {
    return (
      <Alert className={className}>
        <CalendarRange className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            No hay periodo activo. Activa un periodo para ver los datos.
          </span>
          <Button
            onClick={() => router.push('/periodos')}
            size="sm"
            variant="outline"
          >
            Ir a Periodos
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main message */}
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CalendarRange className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">No hay periodo activo</h2>
          <p className="mx-auto max-w-md text-muted-foreground">
            Para comenzar a usar la aplicación y ver tus datos financieros,
            necesitas tener un periodo presupuestario activo.
          </p>
        </div>
      </div>

      {/* Action cards */}
      <div className="mx-auto grid max-w-2xl gap-4 md:grid-cols-2">
        {hasNoPeriods ? (
          // No periods exist - guide to create one
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Crear primer periodo
              </CardTitle>
              <CardDescription>
                No tienes periodos creados. Crea tu primer periodo
                presupuestario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Define el nombre del periodo (ej: "Enero 2025")</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Selecciona el mes y año</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>El periodo se activará automáticamente</span>
                </div>
              </div>
              <Button
                onClick={() => router.push('/periodos')}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear periodo
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Periods exist but none active - guide to activate one
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Activar periodo existente
              </CardTitle>
              <CardDescription>
                Tienes {periods.length} periodo{periods.length !== 1 ? 's' : ''}{' '}
                creado
                {periods.length !== 1 ? 's' : ''}. Activa uno para comenzar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Ve a la sección de Periodos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Selecciona el periodo que deseas activar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Haz clic en "Abrir" para activarlo</span>
                </div>
              </div>
              <Button
                onClick={() => router.push('/periodos')}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                Activar periodo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create new period option (always available) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Crear nuevo periodo
            </CardTitle>
            <CardDescription>
              Crea un nuevo periodo presupuestario para un mes específico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Un periodo te permite:</p>
              <ul className="ml-4 space-y-1">
                <li>• Organizar gastos e ingresos por mes</li>
                <li>• Establecer presupuestos por categoría</li>
                <li>• Hacer seguimiento a tus metas financieras</li>
                <li>• Generar reportes y análisis</li>
              </ul>
            </div>
            <Button
              onClick={() => router.push('/periodos')}
              variant="outline"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear nuevo periodo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick start guide */}
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Guía rápida
          </CardTitle>
          <CardDescription>
            Pasos para comenzar a usar Budget Tracker
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                1
              </div>
              <div>
                <p className="font-medium">Crear o activar un periodo</p>
                <p className="text-sm text-muted-foreground">
                  Define el periodo presupuestario que quieres gestionar
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                2
              </div>
              <div>
                <p className="font-medium">Configurar categorías</p>
                <p className="text-sm text-muted-foreground">
                  Crea categorías para organizar tus gastos (ej: Alimentación,
                  Transporte)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                3
              </div>
              <div>
                <p className="font-medium">Establecer presupuestos</p>
                <p className="text-sm text-muted-foreground">
                  Define cuánto planeas gastar en cada categoría
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                4
              </div>
              <div>
                <p className="font-medium">Registrar ingresos y gastos</p>
                <p className="text-sm text-muted-foreground">
                  Comienza a registrar tus transacciones financieras
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <Button onClick={() => router.push('/periodos')} className="w-full">
              Comenzar ahora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
