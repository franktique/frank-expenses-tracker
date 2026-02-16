'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BookOpen,
  PlusCircle,
  Edit,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

type Estudio = {
  id: number;
  name: string;
  grouper_count: number;
  created_at: string;
  updated_at: string;
};

export default function EstudiosPage() {
  const [estudios, setEstudios] = useState<Estudio[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newEstudioName, setNewEstudioName] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [currentEstudio, setCurrentEstudio] = useState<Estudio | null>(null);
  const [editEstudioName, setEditEstudioName] = useState<string>('');

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Fetch estudios with retry mechanism
  const fetchEstudios = async (isRetry = false) => {
    try {
      setIsLoading(true);
      if (!isRetry) {
        setFetchError(null);
      }

      const response = await fetch('/api/estudios');

      if (response.ok) {
        const data = await response.json();
        setEstudios(data);
        setFetchError(null);
        setRetryCount(0);
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          error.error || `Error ${response.status}: ${response.statusText}`;
        setFetchError(errorMessage);

        if (!isRetry) {
          toast({
            title: 'Error al cargar estudios',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching estudios:', error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes('fetch')
            ? 'Error de conexión. Verifique su conexión a internet.'
            : error.message
          : 'No se pudieron cargar los estudios';

      setFetchError(errorMessage);

      if (!isRetry) {
        toast({
          title: 'Error al cargar estudios',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Retry function with exponential backoff
  const retryFetchEstudios = async () => {
    if (retryCount >= maxRetries) {
      toast({
        title: 'Error persistente',
        description:
          'Se alcanzó el máximo número de reintentos. Recargue la página.',
        variant: 'destructive',
      });
      return;
    }

    setRetryCount((prev) => prev + 1);
    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    toast({
      title: 'Reintentando...',
      description: `Intento ${retryCount + 1} de ${maxRetries}`,
    });

    setTimeout(() => {
      fetchEstudios(true);
    }, delay);
  };

  useEffect(() => {
    fetchEstudios();
  }, []);

  const [isCreating, setIsCreating] = useState(false);

  // Add new estudio with enhanced validation and error handling
  const handleAddEstudio = async () => {
    const trimmedName = newEstudioName.trim();

    // Client-side validation
    if (!trimmedName) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor ingrese un nombre para el estudio',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName.length > 255) {
      toast({
        title: 'Nombre muy largo',
        description: 'El nombre no puede exceder 255 caracteres',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate names locally first
    const duplicateExists = estudios.some(
      (estudio) => estudio.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateExists) {
      toast({
        title: 'Nombre duplicado',
        description: 'Ya existe un estudio con este nombre',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);

      const response = await fetch('/api/estudios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (response.ok) {
        const newEstudio = await response.json();
        setEstudios([...estudios, { ...newEstudio, grouper_count: 0 }]);
        setNewEstudioName('');
        setIsAddDialogOpen(false);
        toast({
          title: 'Estudio creado',
          description: `El estudio "${trimmedName}" ha sido creado con éxito.`,
        });
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          error.error || `Error ${response.status}: ${response.statusText}`;

        toast({
          title: 'Error al crear estudio',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Exception while creating estudio:', error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes('fetch')
            ? 'Error de conexión. Verifique su conexión a internet.'
            : error.message
          : 'No se pudo crear el estudio';

      toast({
        title: 'Error al crear estudio',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const [isUpdating, setIsUpdating] = useState(false);

  // Update estudio with enhanced validation and error handling
  const handleUpdateEstudio = async () => {
    if (!currentEstudio) return;

    const trimmedName = editEstudioName.trim();

    // Client-side validation
    if (!trimmedName) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor ingrese un nombre para el estudio',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName.length > 255) {
      toast({
        title: 'Nombre muy largo',
        description: 'El nombre no puede exceder 255 caracteres',
        variant: 'destructive',
      });
      return;
    }

    // Check if name actually changed
    if (trimmedName === currentEstudio.name) {
      setIsEditDialogOpen(false);
      return;
    }

    // Check for duplicate names locally first (excluding current estudio)
    const duplicateExists = estudios.some(
      (estudio) =>
        estudio.id !== currentEstudio.id &&
        estudio.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateExists) {
      toast({
        title: 'Nombre duplicado',
        description: 'Ya existe otro estudio con este nombre',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdating(true);

      const response = await fetch(`/api/estudios/${currentEstudio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (response.ok) {
        const updatedEstudio = await response.json();
        setEstudios(
          estudios.map((e) =>
            e.id === currentEstudio.id
              ? {
                  ...updatedEstudio,
                  grouper_count: currentEstudio.grouper_count,
                }
              : e
          )
        );
        setIsEditDialogOpen(false);
        toast({
          title: 'Estudio actualizado',
          description: `El estudio ha sido actualizado a "${trimmedName}".`,
        });
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          error.error || `Error ${response.status}: ${response.statusText}`;

        toast({
          title: 'Error al actualizar estudio',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Exception while updating estudio:', error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes('fetch')
            ? 'Error de conexión. Verifique su conexión a internet.'
            : error.message
          : 'No se pudo actualizar el estudio';

      toast({
        title: 'Error al actualizar estudio',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  // Delete estudio with enhanced error handling
  const handleDeleteEstudio = async () => {
    if (!currentEstudio) return;

    // Check if this is the last estudio
    if (estudios.length === 1) {
      toast({
        title: 'No se puede eliminar',
        description:
          'No se puede eliminar el último estudio. Debe existir al menos un estudio para usar el dashboard.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/estudios/${currentEstudio.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        setEstudios(estudios.filter((e) => e.id !== currentEstudio.id));
        setIsDeleteDialogOpen(false);

        const grouperMessage =
          result.grouperCount > 0
            ? ` Los ${result.grouperCount} agrupadores han sido desasociados.`
            : '';

        toast({
          title: 'Estudio eliminado',
          description: `El estudio "${currentEstudio.name}" ha sido eliminado.${grouperMessage}`,
        });
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          error.error || `Error ${response.status}: ${response.statusText}`;

        // Handle specific error cases
        if (error.code === 'LAST_ESTUDIO') {
          toast({
            title: 'No se puede eliminar',
            description: errorMessage,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error al eliminar estudio',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error deleting estudio:', error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes('fetch')
            ? 'Error de conexión. Verifique su conexión a internet.'
            : error.message
          : 'No se pudo eliminar el estudio';

      toast({
        title: 'Error al eliminar estudio',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Estudios</h1>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Estudio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estudios</CardTitle>
          <CardDescription>
            Gestione los estudios para organizar sus agrupadores en colecciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                <span>Cargando estudios...</span>
              </div>
            </div>
          ) : fetchError ? (
            <div className="py-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="text-destructive">
                  <AlertCircle className="mx-auto mb-2 h-12 w-12" />
                  <p className="font-medium">Error al cargar estudios</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fetchError}
                  </p>
                </div>
                <Button
                  onClick={retryFetchEstudios}
                  variant="outline"
                  disabled={retryCount >= maxRetries}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {retryCount >= maxRetries
                    ? 'Máximo de reintentos alcanzado'
                    : 'Reintentar'}
                </Button>
                {retryCount >= maxRetries && (
                  <Button
                    onClick={() => window.location.reload()}
                    variant="default"
                  >
                    Recargar página
                  </Button>
                )}
              </div>
            </div>
          ) : estudios.length === 0 ? (
            <div className="py-8 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">
                No hay estudios definidos
              </h3>
              <p className="mb-4 text-muted-foreground">
                Cree un estudio para comenzar a organizar sus agrupadores en
                colecciones.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear primer estudio
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Agrupadores</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estudios.map((estudio) => (
                  <TableRow key={estudio.id}>
                    <TableCell className="font-medium">
                      {estudio.name}
                    </TableCell>
                    <TableCell>{estudio.grouper_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentEstudio(estudio);
                            setEditEstudioName(estudio.name);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentEstudio(estudio);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.location.href = `/estudios/${estudio.id}`;
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

      {/* Add Estudio Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setNewEstudioName(''); // Reset input when dialog closes
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Estudio</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nombre del estudio"
              value={newEstudioName}
              onChange={(e) => setNewEstudioName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newEstudioName.trim()) {
                  e.preventDefault();
                  handleAddEstudio();
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
                if (newEstudioName.trim()) {
                  handleAddEstudio();
                }
              }}
              disabled={!newEstudioName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Creando...
                </>
              ) : (
                'Crear'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Estudio Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open && currentEstudio) setEditEstudioName(currentEstudio.name); // Reset to original name
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Estudio</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nombre del estudio"
              value={editEstudioName}
              onChange={(e) => setEditEstudioName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editEstudioName.trim()) {
                  e.preventDefault();
                  handleUpdateEstudio();
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
                if (editEstudioName.trim()) {
                  handleUpdateEstudio();
                }
              }}
              disabled={!editEstudioName.trim() || isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Actualizando...
                </>
              ) : (
                'Actualizar'
              )}
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
            ¿Está seguro de que desea eliminar el estudio "
            {currentEstudio?.name}"?
            {currentEstudio && currentEstudio.grouper_count > 0 && (
              <span className="mt-2 block text-red-500">
                Este estudio contiene {currentEstudio.grouper_count} agrupadores
                que serán desasociados.
              </span>
            )}
          </p>
          <DialogFooter>
            <Button
              onClick={handleDeleteEstudio}
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
