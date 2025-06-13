"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { ArrowLeft, Layers as LayersIcon, PlusCircle, X, Trash2 } from "lucide-react"

type Grouper = {
  id: number
  name: string
  assignedCategories: Category[]
}

type Category = {
  id: string
  name: string
}

export default function GrouperDetailPage() {
  const router = useRouter()
  const params = useParams()
  const grouperId = params?.id as string
  
  const [grouper, setGrouper] = useState<Grouper | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [unassignedCategories, setUnassignedCategories] = useState<Category[]>([])

  // Fetch grouper details
  useEffect(() => {
    const fetchGrouperDetails = async () => {
      if (!grouperId) return
      
      try {
        setIsLoading(true)
        const response = await fetch(`/api/groupers/${grouperId}`)
        
        if (response.ok) {
          const data = await response.json()
          setGrouper(data)
        } else {
          const error = await response.json()
          toast({
            title: "Error fetching grouper details",
            description: error.error || "An unknown error occurred",
            variant: "destructive",
          })
          // Redirect back if grouper not found
          if (response.status === 404) {
            router.push("/agrupadores")
          }
        }
      } catch (error) {
        console.error("Error fetching grouper details:", error)
        toast({
          title: "Error fetching grouper details",
          description: "Failed to fetch grouper details",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchGrouperDetails()
  }, [grouperId, router])

  // Fetch all categories
  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        const response = await fetch("/api/categories")
        
        if (response.ok) {
          const data = await response.json()
          setCategories(data)
        } else {
          const error = await response.json()
          toast({
            title: "Error fetching categories",
            description: error.error || "An unknown error occurred",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Error fetching categories",
          description: "Failed to fetch categories",
          variant: "destructive",
        })
      }
    }

    fetchAllCategories()
  }, [])

  // Calculate unassigned categories
  useEffect(() => {
    if (grouper && categories.length > 0) {
      const assignedIds = new Set(grouper.assignedCategories.map(c => c.id))
      const unassigned = categories.filter(c => !assignedIds.has(c.id))
      setUnassignedCategories(unassigned)
    }
  }, [grouper, categories])

  // Add a category to the grouper
  const handleAddCategory = async () => {
    if (!selectedCategoryId || !grouperId) return
    
    try {
      const response = await fetch(`/api/groupers/${grouperId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedCategoryId }), // Send as string
      })

      if (response.ok) {
        // Find the selected category from all categories
        const addedCategory = categories.find(c => c.id === selectedCategoryId) // Compare strings
        
        if (addedCategory && grouper) {
          // Update the grouper state with the new category
          setGrouper({
            ...grouper,
            assignedCategories: [...grouper.assignedCategories, addedCategory]
          })
          
          setIsAddDialogOpen(false)
          setSelectedCategoryId("")
          
          toast({
            title: "Categoría agregada",
            description: `La categoría "${addedCategory.name}" ha sido agregada al agrupador.`,
          })
        }
      } else {
        const error = await response.json()
        toast({
          title: "Error adding category",
          description: error.error || "An unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error adding category",
        description: "Failed to add category to grouper",
        variant: "destructive",
      })
    }
  }

  // Remove a category from the grouper
  const handleRemoveCategory = async (categoryId: string) => {
    if (!grouperId) return
    
    try {
      const response = await fetch(`/api/groupers/${grouperId}/categories?categoryId=${categoryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        if (grouper) {
          // Update the grouper state by removing the category
          const updatedCategories = grouper.assignedCategories.filter(c => c.id !== categoryId) // c.id is string, categoryId is now string
          setGrouper({
            ...grouper,
            assignedCategories: updatedCategories
          })
          
          toast({
            title: "Categoría eliminada",
            description: `La categoría ha sido eliminada del agrupador.`,
          })
        }
      } else {
        const error = await response.json()
        toast({
          title: "Error removing category",
          description: error.error || "An unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error removing category:", error)
      toast({
        title: "Error removing category",
        description: "Failed to remove category from grouper",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Button 
        variant="outline" 
        onClick={() => router.push("/agrupadores")} 
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Agrupadores
      </Button>

      {isLoading ? (
        <div className="text-center py-4">Cargando detalles...</div>
      ) : !grouper ? (
        <div className="text-center py-4">No se encontró el agrupador</div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <LayersIcon className="h-6 w-6" />
              <h1 className="text-3xl font-bold">{grouper.name}</h1>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              disabled={unassignedCategories.length === 0}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar Categoría
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Categorías en este agrupador</CardTitle>
              <CardDescription>
                Administra las categorías asociadas a este agrupador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {grouper.assignedCategories.length === 0 ? (
                <div className="text-center py-4">
                  Este agrupador no tiene categorías asociadas. Agregue algunas utilizando el botón "Agregar Categoría".
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre de la categoría</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouper.assignedCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Add Category Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Categoría</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DialogFooter>
                  <Button onClick={handleAddCategory} disabled={!selectedCategoryId}>
                    Agregar
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
