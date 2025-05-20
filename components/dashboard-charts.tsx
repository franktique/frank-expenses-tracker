"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"

type ChartData = {
  expensesByDate: Array<{
    date: string
    total_amount: number
    payment_method: string
  }>
  expensesByCategory: Array<{
    category_id: string
    category_name: string
    total_amount: number
  }>
}

type DailyExpensesProps = {
  periodId: string | null
}

// Daily Expenses Bar Chart Component
export function DailyExpensesChart({ periodId }: DailyExpensesProps) {
  const [chartData, setChartData] = useState<Array<{date: string, total: number}>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChartData = async () => {
      if (!periodId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/dashboard/charts?periodId=${periodId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch chart data")
        }
        const data = await response.json() as ChartData
        
        // Process data for the daily expenses chart
        const processedData = data.expensesByDate.reduce((acc, item) => {
          const date = format(parseISO(item.date), 'dd/MM/yyyy')
          const existingDay = acc.find(d => d.date === date)
          
          if (existingDay) {
            existingDay.total += Number(item.total_amount)
          } else {
            acc.push({
              date,
              total: Number(item.total_amount)
            })
          }
          return acc
        }, [] as Array<{date: string, total: number}>)
        
        setChartData(processedData)
      } catch (error) {
        console.error("Error fetching chart data:", error)
        setError((error as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChartData()
  }, [periodId])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <p className="text-muted-foreground">No hay datos disponibles para mostrar</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Día</CardTitle>
        <CardDescription>Total de gastos por fecha</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={70}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), "Total"]}
                labelFormatter={(value) => `Fecha: ${value}`}
              />
              <Legend />
              <Bar dataKey="total" name="Total Gastado" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Cumulative Expenses Line Chart Component
export function CumulativeExpensesChart({ periodId }: DailyExpensesProps) {
  const [chartData, setChartData] = useState<Array<{date: string, total: number, cumulative: number}>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChartData = async () => {
      if (!periodId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/dashboard/charts?periodId=${periodId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch chart data")
        }
        const data = await response.json() as ChartData
        
        // First reduce to get daily totals
        const dailyTotals = data.expensesByDate.reduce((acc, item) => {
          const date = format(parseISO(item.date), 'dd/MM/yyyy')
          const existingDay = acc.find(d => d.date === date)
          
          if (existingDay) {
            existingDay.total += Number(item.total_amount)
          } else {
            acc.push({
              date,
              total: Number(item.total_amount),
              cumulative: 0 // Will be calculated next
            })
          }
          return acc
        }, [] as Array<{date: string, total: number, cumulative: number}>)
        
        // Sort by date
        dailyTotals.sort((a, b) => {
          const datePartsA = a.date.split('/').reverse().join('');
          const datePartsB = b.date.split('/').reverse().join('');
          return datePartsA.localeCompare(datePartsB);
        });
        
        // Calculate cumulative values
        let cumulativeTotal = 0
        dailyTotals.forEach(item => {
          cumulativeTotal += item.total
          item.cumulative = cumulativeTotal
        })
        
        setChartData(dailyTotals)
      } catch (error) {
        console.error("Error fetching chart data:", error)
        setError((error as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChartData()
  }, [periodId])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <p className="text-muted-foreground">No hay datos disponibles para mostrar</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos Acumulados</CardTitle>
        <CardDescription>Gastos acumulados a lo largo del tiempo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={70}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), "Total"]}
                labelFormatter={(value) => `Fecha: ${value}`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                name="Gasto Acumulado" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.3}
              />
              <Bar dataKey="total" name="Gasto Diario" fill="#82ca9d" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Category Expenses Bar Chart Component
export function CategoryExpensesChart({ periodId }: DailyExpensesProps) {
  const [chartData, setChartData] = useState<Array<{category: string, total: number, id: string}>>([])
  const [filteredData, setFilteredData] = useState<Array<{category: string, total: number, id: string}>>([])
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChartData = async () => {
      if (!periodId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/dashboard/charts?periodId=${periodId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch chart data")
        }
        const data = await response.json() as ChartData
        
        // Process data for the category chart
        const processedData = data.expensesByCategory.map(item => ({
          category: item.category_name,
          total: Number(item.total_amount),
          id: item.category_id
        }))
        
        setChartData(processedData)
        setFilteredData(processedData)
      } catch (error) {
        console.error("Error fetching chart data:", error)
        setError((error as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChartData()
  }, [periodId])

  // Filter data when excluded categories change
  useEffect(() => {
    const filtered = chartData.filter(item => !excludedCategories.includes(item.id))
    setFilteredData(filtered)
  }, [excludedCategories, chartData])

  const toggleCategory = (categoryId: string) => {
    setExcludedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <p className="text-muted-foreground">No hay datos disponibles para mostrar</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Categoría</CardTitle>
        <CardDescription>Distribución de gastos por categoría</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {chartData.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`category-${item.id}`} 
                checked={!excludedCategories.includes(item.id)}
                onCheckedChange={() => toggleCategory(item.id)}
              />
              <Label 
                htmlFor={`category-${item.id}`}
                className="text-sm truncate"
              >
                {item.category}
              </Label>
            </div>
          ))}
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              layout="vertical"
              margin={{
                top: 20,
                right: 30,
                left: 100,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis 
                dataKey="category" 
                type="category" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), "Total"]}
                labelFormatter={(value) => `Categoría: ${value}`}
              />
              <Legend />
              <Bar dataKey="total" name="Total por Categoría" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
