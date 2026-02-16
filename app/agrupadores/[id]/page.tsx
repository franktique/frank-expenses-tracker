'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Layers as LayersIcon,
  Loader2,
  PlusCircle,
  Trash2,
} from 'lucide-react';

type Grouper = {
  id: number;
  name: string;
  assignedCategories: Category[];
};

type Category = {
  id: string;
  name: string;
};

export default function GrouperDetailPage() {
  const router = useRouter();
  const params = useParams();
  const grouperId = params?.id as string;

  const [grouper, setGrouper] = useState<Grouper | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isAddingCategories, setIsAddingCategories] = useState<boolean>(false);
  const [unassignedCategories, setUnassignedCategories] = useState<Category[]>(
    []
  );

  // Fetch grouper details with enhanced error handling
  useEffect(() => {
    const fetchGrouperDetails = async () => {
      if (!grouperId) return;

      try {
        setIsLoading(true);

        // Use retry mechanism for network failures
        const response = await retryOperation(
          () => fetch(`/api/groupers/${grouperId}`),
          3, // max retries
          1000 // initial delay in ms
        );

        if (response.ok) {
          const data = await response.json();
          setGrouper(data);
        } else {
          let errorMessage = 'Ocurrió un error desconocido';
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
          }

          // Provide specific messages based on status codes
          if (response.status === 404) {
            errorMessage = 'El agrupador no fue encontrado.';
            toast({
              title: '❌ Agrupador no encontrado',
              description: errorMessage,
              variant: 'destructive',
            });
            // Redirect back if grouper not found
            router.push('/agrupadores');
            return;
          } else if (response.status === 400) {
            errorMessage = 'ID de agrupador inválido.';
          } else if (response.status >= 500) {
            errorMessage = 'Error del servidor. Intente recargar la página.';
          }

          toast({
            title: '❌ Error al cargar agrupador',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching grouper details:', error);

        // Enhanced network error handling
        let errorDescription =
          'No se pudieron cargar los detalles del agrupador.';

        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorDescription =
            'Error de red. Verifique su conexión a internet e intente recargar la página.';
        } else if (error instanceof Error) {
          errorDescription = `Error: ${error.message}. Intente recargar la página.`;
        } else {
          errorDescription =
            'Error desconocido. Intente recargar la página más tarde.';
        }

        toast({
          title: '❌ Error de conexión',
          description: errorDescription,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrouperDetails();
  }, [grouperId, router]);

  // Fetch all categories with enhanced error handling
  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        // Use retry mechanism for network failures
        const response = await retryOperation(
          () => fetch('/api/categories'),
          3, // max retries
          1000 // initial delay in ms
        );

        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        } else {
          let errorMessage = 'Ocurrió un error desconocido';
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
          }

          // Provide specific messages based on status codes
          if (response.status >= 500) {
            errorMessage =
              'Error del servidor al cargar categorías. Intente recargar la página.';
          } else if (response.status === 400) {
            errorMessage = 'Solicitud inválida al cargar categorías.';
          }

          toast({
            title: '❌ Error al cargar categorías',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching categories:', error);

        // Enhanced network error handling
        let errorDescription = 'No se pudieron cargar las categorías.';

        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorDescription =
            'Error de red. Las categorías no estarán disponibles hasta que se restablezca la conexión.';
        } else if (error instanceof Error) {
          errorDescription = `Error: ${error.message}. Las categorías no estarán disponibles.`;
        } else {
          errorDescription =
            'Error desconocido. Las categorías no estarán disponibles.';
        }

        toast({
          title: '❌ Error de conexión',
          description: errorDescription,
          variant: 'destructive',
        });
      }
    };

    fetchAllCategories();
  }, []);

  // Calculate unassigned categories and sort them alphabetically
  useEffect(() => {
    if (grouper && categories.length > 0) {
      const assignedIds = new Set(grouper.assignedCategories.map((c) => c.id));
      const unassigned = categories
        .filter((c) => !assignedIds.has(c.id))
        .sort((a, b) =>
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );
      setUnassignedCategories(unassigned);
    }
  }, [grouper, categories]);

  // Handle checkbox selection/deselection
  const handleCategorySelection = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategoryIds((prev) => [...prev, categoryId]);
    } else {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
    }
  };

  // Handle dialog close/cancel - clear selections
  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setSelectedCategoryIds([]);
  };

  // Retry mechanism for network failures
  const retryOperation = async (
    operation: () => Promise<Response>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<Response> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await operation();
        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retrying with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError!;
  };

  // Handle batch category addition with enhanced error handling
  const handleAddCategories = async () => {
    if (selectedCategoryIds.length === 0 || !grouperId) return;

    try {
      setIsAddingCategories(true);

      // Use retry mechanism for network failures
      const response = await retryOperation(
        () =>
          fetch(`/api/groupers/${grouperId}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryIds: selectedCategoryIds }),
          }),
        3, // max retries
        1000 // initial delay in ms
      );

      if (response.ok || response.status === 207) {
        // Handle both success (200) and partial success (207) responses
        const result = await response.json();

        if (
          result.addedCategories &&
          result.addedCategories.length > 0 &&
          grouper
        ) {
          // Find the successfully added categories from all categories
          const addedCategoryDetails = result.addedCategories
            .map((addedCat: any) =>
              categories.find((c) => c.id === addedCat.id)
            )
            .filter(Boolean);

          // Update the grouper state with the new categories
          setGrouper({
            ...grouper,
            assignedCategories: [
              ...grouper.assignedCategories,
              ...addedCategoryDetails,
            ],
          });
        }

        handleDialogClose();

        // Enhanced success/partial success messaging
        if (
          result.added > 0 &&
          result.skipped === 0 &&
          result.errors.length === 0
        ) {
          // All categories added successfully
          toast({
            title: '✅ Categorías agregadas exitosamente',
            description: `${result.added} ${
              result.added === 1
                ? 'categoría ha sido agregada'
                : 'categorías han sido agregadas'
            } al agrupador.`,
          });
        } else if (
          result.added > 0 &&
          (result.skipped > 0 || result.errors.length > 0)
        ) {
          // Partial success with detailed information
          let description = `${result.added} ${
            result.added === 1 ? 'categoría agregada' : 'categorías agregadas'
          }`;
          if (result.skipped > 0) {
            description += `, ${result.skipped} ${
              result.skipped === 1
                ? 'ya estaba asignada'
                : 'ya estaban asignadas'
            }`;
          }
          if (result.errors.length > 0) {
            description += `, ${result.errors.length} ${
              result.errors.length === 1 ? 'falló' : 'fallaron'
            }`;

            // Show first few error details if available
            if (result.errors.length <= 3) {
              description += `: ${result.errors.join(', ')}`;
            } else {
              description += `. Ver consola para más detalles.`;
              console.error('Detailed errors:', result.errors);
            }
          }

          toast({
            title: '⚠️ Categorías procesadas parcialmente',
            description: description,
            variant: 'default',
          });
        } else if (result.skipped > 0 && result.added === 0) {
          // All categories were already assigned
          toast({
            title: 'ℹ️ Categorías ya asignadas',
            description: `${
              result.skipped === 1
                ? 'La categoría seleccionada ya estaba asignada'
                : 'Todas las categorías seleccionadas ya estaban asignadas'
            } a este agrupador.`,
            variant: 'destructive',
          });
        } else if (result.errors.length > 0 && result.added === 0) {
          // All operations failed - show detailed error information
          let errorDescription = `No se pudieron agregar las categorías. ${
            result.errors.length
          } ${
            result.errors.length === 1
              ? 'error encontrado'
              : 'errores encontrados'
          }`;

          // Show specific error details for better debugging
          if (result.errors.length <= 2) {
            errorDescription += `: ${result.errors.join(', ')}`;
          } else {
            errorDescription += `. Errores: ${result.errors
              .slice(0, 2)
              .join(', ')}${
              result.errors.length > 2
                ? ` y ${result.errors.length - 2} más`
                : ''
            }`;
            console.error('All errors:', result.errors);
          }

          toast({
            title: '❌ Error al agregar categorías',
            description: errorDescription,
            variant: 'destructive',
          });
        }
      } else {
        // Handle server errors with detailed information
        let errorMessage = 'Ocurrió un error desconocido en el servidor';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;

          // Log additional error details if available
          if (error.details) {
            console.error('Server error details:', error.details);
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }

        toast({
          title: '❌ Error al agregar categorías',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding categories:', error);

      // Enhanced network error handling
      let errorTitle = '❌ Error de conexión';
      let errorDescription = 'No se pudo conectar con el servidor.';

      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorDescription =
          'Error de red. Verifique su conexión a internet e intente nuevamente.';
      } else if (error instanceof Error) {
        errorDescription = `Error: ${error.message}. Intente nuevamente.`;
      } else {
        errorDescription = 'Error desconocido. Intente nuevamente más tarde.';
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      setIsAddingCategories(false);
    }
  };

  // Remove a category from the grouper with enhanced error handling
  const handleRemoveCategory = async (categoryId: string) => {
    if (!grouperId) return;

    try {
      // Use retry mechanism for network failures
      const response = await retryOperation(
        () =>
          fetch(
            `/api/groupers/${grouperId}/categories?categoryId=${categoryId}`,
            {
              method: 'DELETE',
            }
          ),
        3, // max retries
        1000 // initial delay in ms
      );

      if (response.ok) {
        if (grouper) {
          // Update the grouper state by removing the category
          const updatedCategories = grouper.assignedCategories.filter(
            (c) => c.id !== categoryId
          );
          setGrouper({
            ...grouper,
            assignedCategories: updatedCategories,
          });

          toast({
            title: '✅ Categoría eliminada',
            description: `La categoría ha sido eliminada exitosamente del agrupador.`,
          });
        }
      } else {
        // Enhanced error handling with specific status codes
        let errorMessage = 'Ocurrió un error desconocido';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }

        // Provide specific messages based on status codes
        if (response.status === 404) {
          errorMessage =
            'La categoría no está asignada a este agrupador o no existe.';
        } else if (response.status === 400) {
          errorMessage =
            'Solicitud inválida. Verifique los datos e intente nuevamente.';
        } else if (response.status >= 500) {
          errorMessage = 'Error del servidor. Intente nuevamente más tarde.';
        }

        toast({
          title: '❌ Error al eliminar categoría',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error removing category:', error);

      // Enhanced network error handling
      let errorDescription = 'No se pudo eliminar la categoría.';

      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorDescription =
          'Error de red. Verifique su conexión a internet e intente nuevamente.';
      } else if (error instanceof Error) {
        errorDescription = `Error: ${error.message}. Intente nuevamente.`;
      } else {
        errorDescription = 'Error desconocido. Intente nuevamente más tarde.';
      }

      toast({
        title: '❌ Error de conexión',
        description: errorDescription,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="outline"
        onClick={() => router.push('/agrupadores')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Agrupadores
      </Button>

      {isLoading ? (
        <div className="py-4 text-center">Cargando detalles...</div>
      ) : !grouper ? (
        <div className="py-4 text-center">No se encontró el agrupador</div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayersIcon className="h-6 w-6" />
              <h1 className="text-3xl font-bold">{grouper.name}</h1>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              disabled={unassignedCategories.length === 0}
              title={
                unassignedCategories.length === 0
                  ? 'No hay categorías disponibles para agregar'
                  : 'Agregar categorías a este agrupador'
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {unassignedCategories.length === 0
                ? 'Sin categorías disponibles'
                : 'Agregar Categoría'}
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
                <div className="py-4 text-center">
                  Este agrupador no tiene categorías asociadas. Agregue algunas
                  utilizando el botón "Agregar Categoría".
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
                    {grouper.assignedCategories
                      .sort((a, b) =>
                        a.name.localeCompare(b.name, 'es', {
                          sensitivity: 'base',
                        })
                      )
                      .map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">
                            {category.name}
                          </TableCell>
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
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => !open && handleDialogClose()}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Categorías</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {unassignedCategories.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <div className="mb-2">
                      <PlusCircle className="mx-auto mb-3 h-12 w-12 opacity-50" />
                    </div>
                    <div className="mb-1 font-medium">
                      No hay categorías disponibles
                    </div>
                    <div className="text-sm">
                      {categories.length === 0
                        ? 'No se han creado categorías en el sistema. Cree algunas categorías primero.'
                        : 'Todas las categorías existentes ya están asignadas a este agrupador.'}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {unassignedCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={selectedCategoryIds.includes(category.id)}
                          onCheckedChange={(checked) =>
                            handleCategorySelection(
                              category.id,
                              checked as boolean
                            )
                          }
                        />
                        <label
                          htmlFor={`category-${category.id}`}
                          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleDialogClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddCategories}
                  disabled={
                    selectedCategoryIds.length === 0 || isAddingCategories
                  }
                >
                  {isAddingCategories ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Agregando...
                    </>
                  ) : (
                    `Agregar${
                      selectedCategoryIds.length > 0
                        ? ` (${selectedCategoryIds.length})`
                        : ''
                    }`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
