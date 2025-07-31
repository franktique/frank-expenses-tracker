"use client";

import { useState, useMemo } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useBudget } from "@/context/budget-context";
import { FundFilter } from "@/components/fund-filter";
import { Fund } from "@/types/funds";

export function CategoriesView() {
  const { categories, addCategory, updateCategory, deleteCategory, funds } =
    useBudget();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryFund, setNewCategoryFund] = useState<Fund | null>(null);
  const [editCategory, setEditCategory] = useState<{
    id: string;
    name: string;
    fund_id?: string;
    fund_name?: string;
  } | null>(null);
  const [editCategoryFund, setEditCategoryFund] = useState<Fund | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fundFilter, setFundFilter] = useState<Fund | null>(null);

  // Filter categories based on selected fund
  const filteredCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    if (!fundFilter) {
      return categories;
    }
    return categories.filter((category) => category.fund_id === fundFilter.id);
  }, [categories, fundFilter]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    try {
      await addCategory(newCategoryName, newCategoryFund?.id);
      setNewCategoryName("");
      setNewCategoryFund(null);
      setIsAddOpen(false);
      toast({
        title: "Categoría agregada",
        description: `La categoría ha sido agregada exitosamente${
          newCategoryFund ? ` al fondo "${newCategoryFund.name}"` : ""
        }`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar la categoría",
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = async () => {
    if (!editCategory || !editCategory.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateCategory(
        editCategory.id,
        editCategory.name,
        editCategoryFund?.id
      );
      setEditCategory(null);
      setEditCategoryFund(null);
      setIsEditOpen(false);
      toast({
        title: "Categoría actualizada",
        description: "La categoría ha sido actualizada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (deleteId) {
      try {
        await deleteCategory(deleteId);
        setDeleteId(null);
        setIsDeleteOpen(false);
        toast({
          title: "Categoría eliminada",
          description: "La categoría ha sido eliminada exitosamente",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar la categoría",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditClick = (category: (typeof categories)[0]) => {
    setEditCategory(category);
    // Find the fund for this category
    const categoryFund =
      category.fund_id && funds
        ? funds.find((f) => f.id === category.fund_id)
        : null;
    setEditCategoryFund(categoryFund || null);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="fund-filter">Filtrar por fondo:</Label>
            <FundFilter
              selectedFund={fundFilter}
              onFundChange={setFundFilter}
              placeholder="Todos los fondos"
              includeAllFunds={true}
              allFundsLabel="Todos los fondos"
              className="w-[200px]"
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Categoría</DialogTitle>
                <DialogDescription>
                  Ingresa el nombre de la nueva categoría de presupuesto y
                  asígnala a un fondo
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej: Alimentación, Transporte, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fund">Fondo (opcional)</Label>
                  <FundFilter
                    selectedFund={newCategoryFund}
                    onFundChange={setNewCategoryFund}
                    placeholder="Seleccionar fondo..."
                    includeAllFunds={false}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Si no seleccionas un fondo, se asignará al fondo
                    "Disponible" por defecto
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddCategory}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorías de Presupuesto</CardTitle>
          <CardDescription>
            Administra las categorías para clasificar tus gastos
            {fundFilter &&
              ` - Mostrando categorías del fondo "${fundFilter.name}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fondo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filteredCategories || [])
                .slice()
                .sort((a, b) =>
                  a.name.localeCompare(b.name, "es", { sensitivity: "base" })
                )
                .map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {category.fund_name || "Disponible"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(category)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setDeleteId(category.id);
                          setIsDeleteOpen(true);
                        }}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {(!filteredCategories || filteredCategories.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-4 text-muted-foreground"
                  >
                    {fundFilter
                      ? `No hay categorías en el fondo "${fundFilter.name}". Agrega una nueva categoría para comenzar.`
                      : "No hay categorías. Agrega una nueva categoría para comenzar."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
            <DialogDescription>
              Actualiza el nombre de la categoría y su asignación de fondo
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editCategory?.name || ""}
                onChange={(e) =>
                  setEditCategory((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-fund">Fondo (opcional)</Label>
              <FundFilter
                selectedFund={editCategoryFund}
                onFundChange={setEditCategoryFund}
                placeholder="Seleccionar fondo..."
                includeAllFunds={false}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Si no seleccionas un fondo, se asignará al fondo "Disponible"
                por defecto
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCategory}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Categoría</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta categoría? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
