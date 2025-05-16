"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

export type Category = {
  id: string
  name: string
}

export type Period = {
  id: string
  name: string
  month: number
  year: number
  is_open: boolean
  isOpen: boolean
}

export type Budget = {
  id: string
  category_id: string
  period_id: string
  expected_amount: number
}

export type Income = {
  id: string
  period_id: string
  date: string
  description: string
  amount: number
}

export type PaymentMethod = "credit" | "debit" | "cash"

export type Expense = {
  id: string
  category_id: string
  period_id: string
  date: string
  event?: string
  payment_method: PaymentMethod
  description: string
  amount: number
}

type BudgetContextType = {
  categories: Category[]
  periods: Period[]
  budgets: Budget[]
  incomes: Income[]
  expenses: Expense[]
  activePeriod: Period | null
  isLoading: boolean
  error: string | null
  isDbInitialized: boolean
  dbConnectionError: boolean
  connectionErrorDetails: string | null
  setupDatabase: () => Promise<void>
  addCategory: (name: string) => Promise<void>
  updateCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addPeriod: (name: string, month: number, year: number) => Promise<void>
  updatePeriod: (id: string, name: string, month: number, year: number) => Promise<void>
  deletePeriod: (id: string) => Promise<void>
  openPeriod: (id: string) => Promise<void>
  addBudget: (categoryId: string, periodId: string, expectedAmount: number) => Promise<void>
  updateBudget: (id: string, expectedAmount: number) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  addIncome: (periodId: string, date: string, description: string, amount: number) => Promise<void>
  updateIncome: (id: string, periodId: string, date: string, description: string, amount: number) => Promise<void>
  deleteIncome: (id: string) => Promise<void>
  addExpense: (
    categoryId: string,
    periodId: string,
    date: string,
    event: string | undefined,
    paymentMethod: PaymentMethod,
    description: string,
    amount: number,
  ) => Promise<void>
  updateExpense: (
    id: string,
    categoryId: string,
    date: string,
    event: string | undefined,
    paymentMethod: PaymentMethod,
    description: string,
    amount: number,
  ) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  getCategoryById: (id: string) => Category | undefined
  getPeriodById: (id: string) => Period | undefined
  refreshData: () => Promise<void>
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [activePeriod, setActivePeriod] = useState<Period | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDbInitialized, setIsDbInitialized] = useState(false)
  const [dbConnectionError, setDbConnectionError] = useState(false)
  const [connectionErrorDetails, setConnectionErrorDetails] = useState<string | null>(null)

  // Check if database is initialized
  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        const response = await fetch("/api/check-db-status")

        // Handle non-OK responses
        if (!response.ok) {
          let errorMessage = `HTTP error ${response.status}`

          try {
            // Try to parse as JSON first
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            // If JSON parsing fails, try to get text
            try {
              const errorText = await response.text()
              errorMessage = errorText || errorMessage
            } catch (textError) {
              // If all else fails, use the status code
              console.error("Failed to parse error response:", textError)
            }
          }

          console.error("Database status check failed:", errorMessage)
          setDbConnectionError(true)
          setConnectionErrorDetails(errorMessage)
          setIsLoading(false)
          return
        }

        let data
        try {
          data = await response.json()
        } catch (err) {
          console.error("Error parsing JSON response:", err)
          setDbConnectionError(true)
          setConnectionErrorDetails("Invalid JSON response from server")
          setIsLoading(false)
          return
        }

        if (!data.connected) {
          setDbConnectionError(true)
          setConnectionErrorDetails(data.error || "Could not connect to database")
          setIsLoading(false)
          return
        }

        setIsDbInitialized(data.initialized)
        setDbConnectionError(false)
        setConnectionErrorDetails(null)

        if (data.initialized) {
          refreshData()
        } else {
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Error checking database status:", err)
        setDbConnectionError(true)
        setConnectionErrorDetails((err as Error).message)
        setIsLoading(false)
      }
    }

    checkDbStatus()
  }, [])

  // Setup database
  const setupDatabase = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/setup-db")

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setIsDbInitialized(true)
        setDbConnectionError(false)
        setConnectionErrorDetails(null)
        await refreshData()
      } else {
        throw new Error(data.message || "Unknown error setting up database")
      }
    } catch (err) {
      setError((err as Error).message)
      setIsLoading(false)
      throw err
    }
  }

  const refreshData = async () => {
    if (!isDbInitialized) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch categories
      const categoriesResponse = await fetch("/api/categories")
      if (!categoriesResponse.ok) {
        const errorText = await categoriesResponse.text()
        throw new Error(`Failed to fetch categories: ${errorText}`)
      }
      const categoriesData = await categoriesResponse.json()
      setCategories(categoriesData)

      // Fetch periods
      const periodsResponse = await fetch("/api/periods")
      if (!periodsResponse.ok) {
        const errorText = await periodsResponse.text()
        throw new Error(`Failed to fetch periods: ${errorText}`)
      }
      const periodsData = await periodsResponse.json()

      // Normalize period data to ensure consistent property names
      const normalizedPeriods = periodsData.map((period: any) => ({
        ...period,
        // Ensure both properties exist for compatibility
        is_open: period.is_open || period.isOpen || false,
        isOpen: period.is_open || period.isOpen || false,
      }))

      setPeriods(normalizedPeriods)

      // Set active period
      const active = normalizedPeriods.find((p: Period) => p.is_open || p.isOpen)
      if (active) setActivePeriod(active)

      // Fetch budgets
      const budgetsResponse = await fetch("/api/budgets")
      if (!budgetsResponse.ok) {
        const errorText = await budgetsResponse.text()
        throw new Error(`Failed to fetch budgets: ${errorText}`)
      }
      const budgetsData = await budgetsResponse.json()
      setBudgets(budgetsData)

      // Fetch incomes
      const incomesResponse = await fetch("/api/incomes")
      if (!incomesResponse.ok) {
        const errorText = await incomesResponse.text()
        throw new Error(`Failed to fetch incomes: ${errorText}`)
      }
      const incomesData = await incomesResponse.json()
      setIncomes(incomesData)

      // Fetch expenses
      const expensesResponse = await fetch("/api/expenses")
      if (!expensesResponse.ok) {
        const errorText = await expensesResponse.text()
        throw new Error(`Failed to fetch expenses: ${errorText}`)
      }
      const expensesData = await expensesResponse.json()
      setExpenses(expensesData)
    } catch (err) {
      console.error("Error refreshing data:", err)
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  // Category functions
  const addCategory = async (name: string) => {
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to add category: ${errorText}`)
      }

      const newCategory = await response.json()
      setCategories([...categories, newCategory])
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const updateCategory = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update category: ${errorText}`)
      }

      const updatedCategory = await response.json()
      setCategories(categories.map((cat) => (cat.id === id ? updatedCategory : cat)))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete category: ${errorText}`)
      }

      setCategories(categories.filter((cat) => cat.id !== id))
      // Budgets and expenses will be deleted by cascade in the database
      setBudgets(budgets.filter((budget) => budget.category_id !== id))
      setExpenses(expenses.filter((expense) => expense.category_id !== id))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  // Period functions
  const addPeriod = async (name: string, month: number, year: number) => {
    try {
      const response = await fetch("/api/periods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, month, year }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to add period: ${errorText}`)
      }

      const newPeriod = await response.json()
      setPeriods([...periods, newPeriod])
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const updatePeriod = async (id: string, name: string, month: number, year: number) => {
    try {
      const response = await fetch(`/api/periods/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, month, year }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update period: ${errorText}`)
      }

      const updatedPeriod = await response.json()
      setPeriods(periods.map((period) => (period.id === id ? updatedPeriod : period)))

      // Update active period if needed
      if (activePeriod && activePeriod.id === id) {
        setActivePeriod(updatedPeriod)
      }
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const deletePeriod = async (id: string) => {
    try {
      const response = await fetch(`/api/periods/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete period: ${errorText}`)
      }

      setPeriods(periods.filter((period) => period.id !== id))

      // Clear active period if it was deleted
      if (activePeriod && activePeriod.id === id) {
        setActivePeriod(null)
      }

      // Budgets and expenses will be deleted by cascade in the database
      setBudgets(budgets.filter((budget) => budget.period_id !== id))
      setExpenses(expenses.filter((expense) => expense.period_id !== id))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const openPeriod = async (id: string) => {
    try {
      // Optimistic update - update UI immediately
      const periodToOpen = periods.find((p) => p.id === id)
      if (periodToOpen) {
        // Update all periods in state immediately
        const updatedPeriods = periods.map((period) => ({
          ...period,
          is_open: period.id === id,
          isOpen: period.id === id,
        }))

        setPeriods(updatedPeriods)
        setActivePeriod({ ...periodToOpen, is_open: true, isOpen: true })
      }

      // Then send request to server
      const response = await fetch(`/api/periods/open/${id}`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to open period: ${errorText}`)
      }

      const openedPeriod = await response.json()

      // Update with server response to ensure consistency
      const finalUpdatedPeriods = periods.map((period) => ({
        ...period,
        is_open: period.id === id,
        isOpen: period.id === id,
      }))

      setPeriods(finalUpdatedPeriods)
      setActivePeriod(openedPeriod)

      return openedPeriod
    } catch (err) {
      setError((err as Error).message)
      // Revert optimistic update if there was an error
      refreshData()
      throw err
    }
  }

  // Budget functions
  const addBudget = async (categoryId: string, periodId: string, expectedAmount: number) => {
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          periodId,
          expectedAmount,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to add budget: ${errorText}`)
      }

      const newBudget = await response.json()

      // Check if this is an update or a new budget
      const existingIndex = budgets.findIndex((b) => b.category_id === categoryId && b.period_id === periodId)

      if (existingIndex >= 0) {
        // Update existing budget
        setBudgets(budgets.map((b, i) => (i === existingIndex ? newBudget : b)))
      } else {
        // Add new budget
        setBudgets([...budgets, newBudget])
      }
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const updateBudget = async (id: string, expectedAmount: number) => {
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expectedAmount }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update budget: ${errorText}`)
      }

      const updatedBudget = await response.json()
      setBudgets(budgets.map((budget) => (budget.id === id ? updatedBudget : budget)))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const deleteBudget = async (id: string) => {
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete budget: ${errorText}`)
      }

      setBudgets(budgets.filter((budget) => budget.id !== id))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  // Income functions
  const addIncome = async (periodId: string, date: string, description: string, amount: number) => {
    try {
      const response = await fetch("/api/incomes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ periodId, date, description, amount }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to add income: ${errorText}`)
      }

      const newIncome = await response.json()
      setIncomes([...incomes, newIncome])
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const updateIncome = async (id: string, periodId: string, date: string, description: string, amount: number) => {
    try {
      const response = await fetch(`/api/incomes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ periodId, date, description, amount }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update income: ${errorText}`)
      }

      const updatedIncome = await response.json()
      setIncomes(incomes.map((income) => (income.id === id ? updatedIncome : income)))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const deleteIncome = async (id: string) => {
    try {
      const response = await fetch(`/api/incomes/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete income: ${errorText}`)
      }

      setIncomes(incomes.filter((income) => income.id !== id))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  // Expense functions
  const addExpense = async (
    categoryId: string,
    periodId: string,
    date: string,
    event: string | undefined,
    paymentMethod: PaymentMethod,
    description: string,
    amount: number,
  ) => {
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          periodId,
          date,
          event,
          paymentMethod,
          description,
          amount,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to add expense: ${errorText}`)
      }

      const newExpense = await response.json()
      setExpenses([...expenses, newExpense])
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const updateExpense = async (
    id: string,
    categoryId: string,
    date: string,
    event: string | undefined,
    paymentMethod: PaymentMethod,
    description: string,
    amount: number,
  ) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          date,
          event,
          paymentMethod,
          description,
          amount,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update expense: ${errorText}`)
      }

      const updatedExpense = await response.json()
      setExpenses(expenses.map((expense) => (expense.id === id ? updatedExpense : expense)))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete expense: ${errorText}`)
      }

      setExpenses(expenses.filter((expense) => expense.id !== id))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  // Helper functions
  const getCategoryById = (id: string) => {
    return categories.find((cat) => cat.id === id)
  }

  const getPeriodById = (id: string) => {
    return periods.find((period) => period.id === id)
  }

  return (
    <BudgetContext.Provider
      value={{
        categories,
        periods,
        budgets,
        incomes,
        expenses,
        activePeriod,
        isLoading,
        error,
        isDbInitialized,
        dbConnectionError,
        connectionErrorDetails,
        setupDatabase,
        addCategory,
        updateCategory,
        deleteCategory,
        addPeriod,
        updatePeriod,
        deletePeriod,
        openPeriod,
        addBudget,
        updateBudget,
        deleteBudget,
        addIncome,
        updateIncome,
        deleteIncome,
        addExpense,
        updateExpense,
        deleteExpense,
        getCategoryById,
        getPeriodById,
        refreshData,
      }}
    >
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}
