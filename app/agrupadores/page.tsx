"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Layers as LayersIcon, PlusCircle, X, Edit, Trash2 } from "lucide-react"

type Grouper = {
  id: number
  name: string
  category_count: number
}

export default function GroupersPage() {
  const [groupers, setGroupers] = useState<Grouper[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [newGrouperName, setNewGrouperName] = useState<string>("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false)
  const [currentGrouper, setCurrentGrouper] = useState<Grouper | null>(null)
  const [editGrouperName, setEditGrouperName] = useState<string>("")

  // Fetch groupers
  useEffect(() => {
    const fetchGroupers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/groupers")
        if (response.ok) {
          const data = await response.json()
          setGroupers(data)
        } else {
          const error = await response.json()
          toast({
            title: "Error fetching groupers",
            description: error.error || "An unknown error occurred",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching groupers:", error)
        toast({
          title: "Error fetching groupers",
          description: "Failed to fetch groupers",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroupers()
  }, [])

  // Add new grouper
  const handleAddGrouper = async () => {
    console.log("Adding new grouper", { newGrouperName });
    
    if (!newGrouperName.trim()) {
      console.log("Empty grouper name, returning");
      return;
    }

    try {
      console.log("Sending POST request to /api/groupers");
      const response = await fetch("/api/groupers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGrouperName.trim() }),
      });

      console.log("Response received", { ok: response.ok, status: response.status });

      if (response.ok) {
        const newGrouper = await response.json();
        console.log("New grouper created:", newGrouper);
        setGroupers([...groupers, { ...newGrouper, category_count: 0 }]);
        setNewGrouperName("");
        setIsAddDialogOpen(false);
        toast({
          title: "Agrupador creado",
          description: `El agrupador "${newGrouperName}" ha sido creado con éxito.`,
        });
      } else {
        const errorText = await response.text();
        console.error("API error response:", { status: response.status, text: errorText });
        
        let errorMessage = "An unknown error occurred";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        
        toast({
          title: "Error creating grouper",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Exception while creating grouper:", error);
      toast({
        title: "Error creating grouper",
        description: "Failed to create grouper",
        variant: "destructive",
      });
    }
  }

  // Update grouper
  const handleUpdateGrouper = async () => {
    console.log("Updating grouper", { editGrouperName, currentGrouper });
    
    if (!editGrouperName.trim() || !currentGrouper) {
      console.log("Empty grouper name or no current grouper, returning");
      return;
    }

    try {
      console.log("Sending PUT request to /api/groupers/" + currentGrouper.id);
      const response = await fetch(`/api/groupers/${currentGrouper.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editGrouperName.trim() }),
      });

      console.log("Response received", { ok: response.ok, status: response.status });

      if (response.ok) {
        const updatedGrouper = await response.json();
        console.log("Grouper updated:", updatedGrouper);
        setGroupers(
          groupers.map(g => 
            g.id === currentGrouper.id 
            ? { ...updatedGrouper, category_count: currentGrouper.category_count } 
            : g
          )
        );
        setIsEditDialogOpen(false);
        toast({
          title: "Agrupador actualizado",
          description: `El agrupador ha sido actualizado a "${editGrouperName}".`,
        });
      } else {
        const errorText = await response.text();
        console.error("API error response:", { status: response.status, text: errorText });
        
        let errorMessage = "An unknown error occurred";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        
        toast({
          title: "Error updating grouper",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Exception while updating grouper:", error);
      toast({
        title: "Error updating grouper",
        description: "Failed to update grouper",
        variant: "destructive",
      });
    }
  }

  // Delete grouper
  const handleDeleteGrouper = async () => {
    if (!currentGrouper) return

    try {
      const response = await fetch(`/api/groupers/${currentGrouper.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setGroupers(groupers.filter(g => g.id !== currentGrouper.id))
        setIsDeleteDialogOpen(false)
        toast({
          title: "Agrupador eliminado",
          description: `El agrupador "${currentGrouper.name}" ha sido eliminado.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error deleting grouper",
          description: error.error || "An unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting grouper:", error)
      toast({
        title: "Error deleting grouper",
        description: "Failed to delete grouper",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <LayersIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Agrupadores</h1>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Agrupador
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agrupadores</CardTitle>
          <CardDescription>
            Gestione los agrupadores para organizar sus categorías de presupuesto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Cargando agrupadores...</div>
          ) : groupers.length === 0 ? (
            <div className="text-center py-4">
              No hay agrupadores definidos. Cree uno nuevo para comenzar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categorías</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupers.map((grouper) => (
                  <TableRow key={grouper.id}>
                    <TableCell className="font-medium">{grouper.name}</TableCell>
                    <TableCell>{grouper.category_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentGrouper(grouper)
                            setEditGrouperName(grouper.name)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentGrouper(grouper)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.location.href = `/agrupadores/${grouper.id}`
                          }}
                        >
                          Administrar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Grouper Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) setNewGrouperName(""); // Reset input when dialog closes
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Agrupador</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nombre del agrupador"
              value={newGrouperName}
              onChange={(e) => setNewGrouperName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newGrouperName.trim()) {
                  e.preventDefault();
                  handleAddGrouper();
                }
              }}
            />
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (newGrouperName.trim()) {
                  console.log("Create button clicked");
                  handleAddGrouper();
                }
              }} 
              disabled={!newGrouperName.trim()}
            >
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Grouper Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open && currentGrouper) setEditGrouperName(currentGrouper.name); // Reset to original name
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agrupador</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nombre del agrupador"
              value={editGrouperName}
              onChange={(e) => setEditGrouperName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editGrouperName.trim()) {
                  e.preventDefault();
                  handleUpdateGrouper();
                }
              }}
            />
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (editGrouperName.trim()) {
                  console.log("Update button clicked");
                  handleUpdateGrouper();
                }
              }} 
              disabled={!editGrouperName.trim()}
            >
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p>
            ¿Está seguro de que desea eliminar el agrupador "{currentGrouper?.name}"?
            {currentGrouper && currentGrouper.category_count > 0 && (
              <span className="block text-red-500 mt-2">
                Este agrupador contiene {currentGrouper.category_count} categorías que serán desasociadas.
              </span>
            )}
          </p>
          <DialogFooter>
            <Button onClick={handleDeleteGrouper} variant="destructive">
              Eliminar
            </Button>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
