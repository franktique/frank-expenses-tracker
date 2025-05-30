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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CumulativeExpensesTooltip } from "@/components/cumulative-expenses-tooltip"
import { DailyExpensesTooltip } from "@/components/daily-expenses-tooltip"

type ChartData = {
  expensesByDate: Array<{
    date: string
    total_amount: number
    payment_method: string
    category_id: string
    category_name: string
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
  const [rawData, setRawData] = useState<ChartData['expensesByDate']>([]) 
  const [chartData, setChartData] = useState<Array<{date: string, total: number}>>([])  
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])  
  const [paymentMethods, setPaymentMethods] = useState<Array<string>>([])  
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])
  const [excludedPaymentMethods, setExcludedPaymentMethods] = useState<string[]>([])
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
        
        // Store raw data for filtering
        setRawData(data.expensesByDate)
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.expensesByDate.map(item => item.category_id)))
          .map(categoryId => {
            const categoryItem = data.expensesByDate.find(item => item.category_id === categoryId)
            return {
              id: categoryId,
              name: categoryItem?.category_name || 'Unknown'
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name))
        
        // Extract unique payment methods
        const uniquePaymentMethods = Array.from(new Set(data.expensesByDate.map(item => item.payment_method)))
          .filter(method => method) // Filter out any null/undefined values
          .sort()
        
        setCategories(uniqueCategories)
        setPaymentMethods(uniquePaymentMethods)
        
        // Process data for the daily expenses chart
        processChartData(data.expensesByDate, [], [])
      } catch (error) {
        console.error("Error fetching chart data:", error)
        setError((error as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChartData()
  }, [periodId])
  
  // Process chart data whenever filters change
  useEffect(() => {
    if (rawData.length > 0) {
      processChartData(rawData, excludedCategories, excludedPaymentMethods)
    }
  }, [rawData, excludedCategories, excludedPaymentMethods])
  
  // Process chart data with filters
  const processChartData = (data: ChartData['expensesByDate'], excludedCats: string[], excludedMethods: string[]) => {
    // Apply both category and payment method filters
    let filteredData = data
    
    // Filter out excluded categories
    if (excludedCats.length > 0) {
      filteredData = filteredData.filter(item => !excludedCats.includes(item.category_id))
    }
    
    // Filter out excluded payment methods
    if (excludedMethods.length > 0) {
      filteredData = filteredData.filter(item => !excludedMethods.includes(item.payment_method))
    }
    
    // Group by date
    const processedData = filteredData.reduce((acc, item) => {
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
    
    // Sort by date
    processedData.sort((a, b) => {
      const datePartsA = a.date.split('/').reverse().join('')
      const datePartsB = b.date.split('/').reverse().join('')
      return datePartsA.localeCompare(datePartsB)
    })
    
    setChartData(processedData)
  }
  
  const toggleCategory = (categoryId: string) => {
    setExcludedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
  }
  
  const togglePaymentMethod = (method: string) => {
    setExcludedPaymentMethods(prev => {
      if (prev.includes(method)) {
        return prev.filter(m => m !== method)
      } else {
        return [...prev, method]
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
        <CardTitle>Gastos por Día</CardTitle>
        <CardDescription>Total de gastos por fecha</CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <Collapsible className="mb-4 space-y-2 px-6 pt-6" defaultOpen={false}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-1 hover:text-primary">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros</span>
              {(excludedCategories.length > 0 || excludedPaymentMethods.length > 0) && (
                <Badge variant="secondary" className="ml-2">
                  {(categories.length - excludedCategories.length) + (paymentMethods.length - excludedPaymentMethods.length)}/
                  {categories.length + paymentMethods.length}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 transition-transform ui-open:rotate-180" />
            </CollapsibleTrigger>
            
            {(excludedCategories.length > 0 || excludedPaymentMethods.length > 0) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2 text-xs" 
                onClick={() => {
                  setExcludedCategories([])
                  setExcludedPaymentMethods([])
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Limpiar filtros
              </Button>
            )}
          </div>
          
          <CollapsibleContent>
            {categories.length > 0 && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium mb-2">Categorías</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`daily-category-${category.id}`} 
                        checked={!excludedCategories.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <Label 
                        htmlFor={`daily-category-${category.id}`}
                        className="text-sm truncate"
                      >
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {paymentMethods.length > 0 && (
              <div className="pt-4 mt-2 border-t">
                <h4 className="text-sm font-medium mb-2">Medio de Pago</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {paymentMethods.map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`daily-payment-${method}`} 
                        checked={!excludedPaymentMethods.includes(method)}
                        onCheckedChange={() => togglePaymentMethod(method)}
                      />
                      <Label 
                        htmlFor={`daily-payment-${method}`}
                        className="text-sm truncate"
                      >
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        <div className="min-h-[400px] h-[60vh] max-h-[900px] w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%" minHeight={350} className="w-full">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 5,
                left: 0,
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
              <Tooltip content={CumulativeExpensesTooltip} />
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
  const [rawData, setRawData] = useState<ChartData['expensesByDate']>([]) 
  const [chartData, setChartData] = useState<Array<{date: string, total: number, cumulative: number}>>([])  
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])  
  const [paymentMethods, setPaymentMethods] = useState<Array<string>>([])  
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])
  const [excludedPaymentMethods, setExcludedPaymentMethods] = useState<string[]>([])
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
        
        // Store raw data for filtering
        setRawData(data.expensesByDate)
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.expensesByDate.map(item => item.category_id)))
          .map(categoryId => {
            const categoryItem = data.expensesByDate.find(item => item.category_id === categoryId)
            return {
              id: categoryId,
              name: categoryItem?.category_name || 'Unknown'
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name))
        
        // Extract unique payment methods
        const uniquePaymentMethods = Array.from(new Set(data.expensesByDate.map(item => item.payment_method)))
          .filter(method => method) // Filter out any null/undefined values
          .sort()
        
        setCategories(uniqueCategories)
        setPaymentMethods(uniquePaymentMethods)
        
        // Process data for the cumulative expenses chart
        processChartData(data.expensesByDate, [], [])
      } catch (error) {
        console.error("Error fetching chart data:", error)
        setError((error as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChartData()
  }, [periodId])
  
  // Process chart data whenever filters change
  useEffect(() => {
    if (rawData.length > 0) {
      processChartData(rawData, excludedCategories, excludedPaymentMethods)
    }
  }, [rawData, excludedCategories, excludedPaymentMethods])
  
  // Process chart data with filters
  const processChartData = (data: ChartData['expensesByDate'], excludedCats: string[], excludedMethods: string[]) => {
    // Apply both category and payment method filters
    let filteredData = data
    
    // Filter out excluded categories
    if (excludedCats.length > 0) {
      filteredData = filteredData.filter(item => !excludedCats.includes(item.category_id))
    }
    
    // Filter out excluded payment methods
    if (excludedMethods.length > 0) {
      filteredData = filteredData.filter(item => !excludedMethods.includes(item.payment_method))
    }
    
    // First reduce to get daily totals
    const dailyTotals = filteredData.reduce((acc, item) => {
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
      const datePartsA = a.date.split('/').reverse().join('')
      const datePartsB = b.date.split('/').reverse().join('')
      return datePartsA.localeCompare(datePartsB)
    })
    
    // Calculate cumulative values
    let cumulativeTotal = 0
    dailyTotals.forEach(item => {
      cumulativeTotal += item.total
      item.cumulative = cumulativeTotal
    })
    
    setChartData(dailyTotals)
  }
  
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
        <CardTitle>Gastos Acumulados</CardTitle>
        <CardDescription>Gastos acumulados a lo largo del tiempo</CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <Collapsible className="mb-4 space-y-2 px-6 pt-6" defaultOpen={false}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-1 hover:text-primary">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros</span>
              {(excludedCategories.length > 0 || excludedPaymentMethods.length > 0) && (
                <Badge variant="secondary" className="ml-2">
                  {(categories.length - excludedCategories.length) + (paymentMethods.length - excludedPaymentMethods.length)}/
                  {categories.length + paymentMethods.length}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 transition-transform ui-open:rotate-180" />
            </CollapsibleTrigger>
            
            {(excludedCategories.length > 0 || excludedPaymentMethods.length > 0) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2 text-xs" 
                onClick={() => {
                  setExcludedCategories([])
                  setExcludedPaymentMethods([])
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Limpiar filtros
              </Button>
            )}
          </div>
          
          <CollapsibleContent>
            {categories.length > 0 && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium mb-2">Categorías</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`cumulative-category-${category.id}`} 
                        checked={!excludedCategories.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <Label 
                        htmlFor={`cumulative-category-${category.id}`}
                        className="text-sm truncate"
                      >
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {paymentMethods.length > 0 && (
              <div className="pt-4 mt-2 border-t">
                <h4 className="text-sm font-medium mb-2">Medio de Pago</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {paymentMethods.map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`cumulative-payment-${method}`} 
                        checked={!excludedPaymentMethods.includes(method)}
                        onCheckedChange={() => togglePaymentMethod(method)}
                      />
                      <Label 
                        htmlFor={`cumulative-payment-${method}`}
                        className="text-sm truncate"
                      >
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        <div className="min-h-[400px] h-[60vh] max-h-[900px] w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%" minHeight={350} className="w-full">
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 5,
                left: 0,
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
              <Tooltip content={CumulativeExpensesTooltip} />
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
  const [rawData, setRawData] = useState<ChartData['expensesByDate']>([]) 
  const [chartData, setChartData] = useState<Array<{category: string, total: number, id: string}>>([])  
  const [filteredData, setFilteredData] = useState<Array<{category: string, total: number, id: string}>>([])  
  const [paymentMethods, setPaymentMethods] = useState<Array<string>>([])  
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])
  const [excludedPaymentMethods, setExcludedPaymentMethods] = useState<string[]>([])
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
        
        // Store raw data for filtering by payment method
        setRawData(data.expensesByDate)
        
        // Extract unique payment methods
        const uniquePaymentMethods = Array.from(new Set(data.expensesByDate.map(item => item.payment_method)))
          .filter(method => method) // Filter out any null/undefined values
          .sort()
        
        setPaymentMethods(uniquePaymentMethods)
        
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

  // Filter data when excluded categories or payment methods change
  useEffect(() => {
    if (excludedPaymentMethods.length === 0) {
      // If no payment method filters, just filter by categories
      const filtered = chartData.filter(item => !excludedCategories.includes(item.id))
      setFilteredData(filtered)
    } else {
      // If payment method filters are active, we need to recalculate totals from raw data
      if (rawData.length > 0) {
        // Filter raw data by payment methods
        const filteredRawData = rawData.filter(item => !excludedPaymentMethods.includes(item.payment_method))
        
        // Group by category and sum amounts
        const categoryTotals = filteredRawData.reduce((acc, item) => {
          const categoryId = item.category_id
          if (!excludedCategories.includes(categoryId)) {
            if (!acc[categoryId]) {
              acc[categoryId] = {
                category: item.category_name,
                total: 0,
                id: categoryId
              }
            }
            acc[categoryId].total += Number(item.total_amount)
          }
          return acc
        }, {} as Record<string, {category: string, total: number, id: string}>)
        
        // Convert to array
        const newFilteredData = Object.values(categoryTotals)
        setFilteredData(newFilteredData)
      }
    }
  }, [excludedCategories, excludedPaymentMethods, chartData, rawData])

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
      <CardContent className="p-0 sm:p-6">
        <Collapsible className="mb-4 space-y-2 px-6 pt-6" defaultOpen={false}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-1 hover:text-primary">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros</span>
              {(excludedCategories.length > 0 || excludedPaymentMethods.length > 0) && (
                <Badge variant="secondary" className="ml-2">
                  {(chartData.length - excludedCategories.length) + (paymentMethods.length - excludedPaymentMethods.length)}/
                  {chartData.length + paymentMethods.length}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 transition-transform ui-open:rotate-180" />
            </CollapsibleTrigger>
            
            {(excludedCategories.length > 0 || excludedPaymentMethods.length > 0) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2 text-xs" 
                onClick={() => {
                  setExcludedCategories([])
                  setExcludedPaymentMethods([])
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Limpiar filtros
              </Button>
            )}
          </div>
          
          <CollapsibleContent>
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">Categorías</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
            </div>
            
            {paymentMethods.length > 0 && (
              <div className="pt-4 mt-2 border-t">
                <h4 className="text-sm font-medium mb-2">Medio de Pago</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {paymentMethods.map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`category-payment-${method}`} 
                        checked={!excludedPaymentMethods.includes(method)}
                        onCheckedChange={() => togglePaymentMethod(method)}
                      />
                      <Label 
                        htmlFor={`category-payment-${method}`}
                        className="text-sm truncate"
                      >
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        <div className="min-h-[400px] h-[60vh] max-h-[900px] w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%" minHeight={350} className="w-full">
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
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded p-2 shadow-md">
                        <p className="font-semibold">{payload[0].payload.category}</p>
                        <p className="text-primary">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
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
