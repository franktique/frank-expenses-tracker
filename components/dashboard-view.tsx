"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  CalendarRange,
  CreditCard,
  Database,
  DollarSign,
  ExternalLink,
  PiggyBank,
  Wallet,
  CreditCardIcon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useBudget } from "@/context/budget-context"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type DashboardData = {
  activePeriod: {
    id: string
    name: string
  } | null
  totalIncome: number
  totalExpenses: number
  budgetSummary: Array<{
    category_id: string
    category_name: string
    expected_amount: number
    total_amount: number
    credit_amount: number
    debit_amount: number
    cash_amount: number
    remaining: number
  }>
}

export function DashboardView() {
  const { activePeriod, isLoading, error, isDbInitialized, dbConnectionError, connectionErrorDetails } = useBudget()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isDbInitialized || dbConnectionError) {
        setIsLoadingData(false)
        return
      }

      setIsLoadingData(true)
      try {
        const response = await fetch("/api/dashboard")
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data")
        }
        const data = await response.json()
        setDashboardData(data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoadingData(false)
      }
    }

    if (!isLoading) {
      fetchDashboardData()
    }
  }, [isLoading, activePeriod, isDbInitialized, dbConnectionError])

  if (isLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (dbConnectionError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de conexión a la base de datos</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              No se pudo conectar a la base de datos. Por favor, verifica tu conexión a la base de datos y asegúrate de
              que las credenciales sean correctas.
            </p>
            {connectionErrorDetails && (
              <div className="text-xs bg-destructive/10 p-2 rounded overflow-auto">
                <p className="font-mono break-all whitespace-pre-wrap">{connectionErrorDetails}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Solución de problemas</CardTitle>
            <CardDescription>Pasos para resolver problemas de conexión a la base de datos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">1. Verifica las variables de entorno</h3>
              <p className="text-sm text-muted-foreground">
                Asegúrate de que la variable de entorno DATABASE_URL esté correctamente configurada en tu proyecto de
                Vercel.
              </p>
            </div>
            <div>
              <h3 className="font-medium">2. Verifica el estado de Neon</h3>
              <p className="text-sm text-muted-foreground">
                Verifica que tu base de datos Neon esté activa y funcionando correctamente.
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => router.push("/setup")} className="w-full">
                <Database className="mr-2 h-4 w-4" />
                Ir a Configuración
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href="https://console.neon.tech" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ir al panel de Neon
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isDbInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Base de datos no configurada</h2>
        <p className="text-muted-foreground max-w-md mb-4">
          Para comenzar a usar la aplicación, primero debes configurar la base de datos.
        </p>
        <Button onClick={() => router.push("/setup")}>Ir a Configuración</Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="text-muted-foreground max-w-md mb-4">{error}</p>
        <Button onClick={() => router.push("/setup")}>Ir a Configuración</Button>
      </div>
    )
  }

  if (!activePeriod || !dashboardData?.activePeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <CalendarRange className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No hay periodo activo</h2>
        <p className="text-muted-foreground max-w-md">
          Para ver el dashboard, primero debes abrir un periodo presupuestario en la sección de Periodos.
        </p>
      </div>
    )
  }

  const { totalIncome, totalExpenses, budgetSummary } = dashboardData
  
  // Calculate total credit card purchases
  const totalCreditCardPurchases = budgetSummary.reduce((sum, item) => sum + item.credit_amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Periodo activo: {dashboardData.activePeriod.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome - totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">{totalIncome > totalExpenses ? "Superávit" : "Déficit"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetSummary.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tarjeta Crédito</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCreditCardPurchases)}</div>
            <p className="text-xs text-muted-foreground">Periodo actual</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Presupuesto</CardTitle>
          <CardDescription>Gastos por categoría en el periodo actual</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Presupuesto</TableHead>
                <TableHead className="text-right">Gasto Total</TableHead>
                <TableHead className="text-right">Tarjeta Crédito</TableHead>
                <TableHead className="text-right">Tarjeta Débito</TableHead>
                <TableHead className="text-right">Efectivo</TableHead>
                <TableHead className="text-right">Restante</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // Initialize running balance with total income
                let runningBalance = totalIncome;
                
                // Return the mapped array
                return budgetSummary.map((item) => {
                  // Calculate the effective expense for this row (debit + cash only)
                  const effectiveExpense = item.debit_amount + item.cash_amount;
                  
                  // Update the running balance by subtracting this row's expenses
                  runningBalance -= effectiveExpense;
                  
                  return (
                    <TableRow key={item.category_id}>
                      <TableCell className="font-medium">{item.category_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.expected_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.credit_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.debit_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.cash_amount)}</TableCell>
                      <TableCell className={`text-right ${item.remaining < 0 ? "text-destructive" : ""}`}>
                        {formatCurrency(item.remaining)}
                      </TableCell>
                      <TableCell className={`text-right ${runningBalance < 0 ? "text-destructive" : ""}`}>
                        {formatCurrency(runningBalance)}
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
              {budgetSummary.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                    No hay datos para mostrar. Agrega categorías y presupuestos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
