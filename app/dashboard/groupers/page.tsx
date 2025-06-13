"use client"

import { useState, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useBudget } from "@/context/budget-context"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList
} from "recharts"

type GrouperData = {
  grouper_id: number
  grouper_name: string
  total_amount: number
}

type CategoryData = {
  category_id: string
  category_name: string
  total_amount: number
}

export default function GroupersChartPage() {
  const router = useRouter()
  const { activePeriod } = useBudget()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [grouperData, setGrouperData] = useState<GrouperData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>("all")
  const [selectedGrouper, setSelectedGrouper] = useState<GrouperData | null>(null)
  const [showCategoryChart, setShowCategoryChart] = useState<boolean>(false)
  const [maxGrouperAmount, setMaxGrouperAmount] = useState<number>(0)
  const [maxCategoryAmount, setMaxCategoryAmount] = useState<number>(0)

  // Define colors for the charts
  const COLORS = [
    "#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c",
    "#d0ed57", "#ffc658", "#ff8042", "#ff6361", "#bc5090"
  ]

  // Fetch groupers data
  useEffect(() => {
    if (!activePeriod) return

    const fetchGrouperData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(
          `/api/dashboard/groupers?periodId=${activePeriod.id}&paymentMethod=${paymentMethod}`
        )
        
        if (response.ok) {
          const data = await response.json()
          const sortedData = data
            // .filter((item: GrouperData) => item.total_amount > 0) // Temporarily removed for debugging
            .sort((a: GrouperData, b: GrouperData) => a.grouper_name.localeCompare(b.grouper_name)) // Sort by name as amount is 0
          
          setGrouperData(sortedData)
          
          // Reset selected grouper if payment method changes
          setSelectedGrouper(null)
          setShowCategoryChart(false)
          setCategoryData([])
          
          // Calculate max amount for chart scaling
          if (sortedData.length > 0) {
            setMaxGrouperAmount(sortedData[0].total_amount * 1.1) // Add 10% for visualization margin
          }
        } else {
          const error = await response.json()
          toast({
            title: "Error fetching grouper data",
            description: error.error || "An unknown error occurred",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching grouper data:", error)
        toast({
          title: "Error fetching grouper data",
          description: "Failed to load grouper statistics",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchGrouperData()
  }, [activePeriod, paymentMethod])

  // Fetch category data when a grouper is selected
  useEffect(() => {
    if (!activePeriod || !selectedGrouper) return
    
    const fetchCategoryData = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/groupers/${selectedGrouper.grouper_id}/categories?periodId=${activePeriod.id}&paymentMethod=${paymentMethod}`
        )
        
        if (response.ok) {
          const data = await response.json()
          const sortedData = data
            .filter((item: CategoryData) => item.total_amount > 0)
            .sort((a: CategoryData, b: CategoryData) => b.total_amount - a.total_amount)
          
          setCategoryData(sortedData)
          setShowCategoryChart(true)
          
          // Calculate max amount for chart scaling
          if (sortedData.length > 0) {
            setMaxCategoryAmount(sortedData[0].total_amount * 1.1) // Add 10% for visualization margin
          }
        } else {
          const error = await response.json()
          toast({
            title: "Error fetching category data",
            description: error.error || "An unknown error occurred",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching category data:", error)
        toast({
          title: "Error fetching category data",
          description: "Failed to load category statistics",
          variant: "destructive",
        })
      }
    }

    fetchCategoryData()
  }, [activePeriod, selectedGrouper, paymentMethod])

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(value)
  }

  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white dark:bg-gray-800 border rounded shadow-sm">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-sm">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  // Handle grouper click
  const handleGrouperClick = (data: GrouperData) => {
    setSelectedGrouper(data)
  }
  
  // Reset category selection
  const handleResetSelection = () => {
    setSelectedGrouper(null)
    setShowCategoryChart(false)
    setCategoryData([])
  }

  return (
    <div className="container mx-auto py-6">
      <Button 
        variant="outline" 
        onClick={() => router.push("/")} 
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Dashboard
      </Button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard de Agrupadores</h1>
        
        <div className="flex items-center gap-4">
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Método de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="credit">Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Cargando datos...</div>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                Total de gastos por agrupador 
                {paymentMethod !== "all" && ` (${paymentMethod === "cash" ? "Efectivo" : "Crédito"})`}
                {activePeriod && ` - ${activePeriod.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grouperData.length === 0 ? (
                <div className="text-center py-10">No hay datos de gastos por agrupador disponibles.</div>
              ) : (
                <div className="w-full h-[400px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={grouperData.map(item => ({
                        name: item.grouper_name,
                        amount: item.total_amount,
                        ...item
                      }))}
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        domain={[0, maxGrouperAmount]}
                        tickFormatter={formatCurrency}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="amount" 
                        onClick={(data) => handleGrouperClick(data)}
                        cursor="pointer"
                      >
                        {grouperData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={selectedGrouper?.grouper_id === entry.grouper_id ? "#ff6361" : COLORS[index % COLORS.length]} 
                          />
                        ))}
                        <LabelList dataKey="amount" position="right" formatter={formatCurrency} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {showCategoryChart && selectedGrouper && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Categorías en agrupador: {selectedGrouper.grouper_name}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleResetSelection}>
                  Volver a todos los agrupadores
                </Button>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <div className="text-center py-10">No hay datos de categorías disponibles para este agrupador.</div>
                ) : (
                  <div className="w-full h-[400px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={categoryData.map(item => ({
                          name: item.category_name,
                          amount: item.total_amount,
                          ...item
                        }))}
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          domain={[0, maxCategoryAmount]}
                          tickFormatter={formatCurrency}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={90}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="amount">
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                          <LabelList dataKey="amount" position="right" formatter={formatCurrency} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
