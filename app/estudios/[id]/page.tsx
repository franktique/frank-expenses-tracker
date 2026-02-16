'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PaymentMethodSelector } from '@/components/payment-method-selector';
import { PaymentMethodBadges } from '@/components/payment-method-badges';
import { PaymentMethodTableSelector } from '@/components/payment-method-table-selector';
import { PaymentMethodErrorBoundary } from '@/components/payment-method-error-boundary';
import { PaymentMethodErrorHandler } from '@/components/payment-method-error-handler';
import {
  usePaymentMethodValidation,
  usePaymentMethodApi,
} from '@/hooks/use-payment-method-validation';
import {
  BookOpen,
  PlusCircle,
  Trash2,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Check,
  X,
  Save,
} from 'lucide-react';

type Grouper = {
  id: number;
  name: string;
  is_assigned?: boolean;
  percentage?: number | null;
  payment_methods?: string[] | null;
};

type EstudioData = {
  id: number;
  name: string;
  assignedGroupers: Grouper[];
  availableGroupers: Grouper[];
};

type PercentageInputProps = {
  grouper: Grouper;
  estudioId: number;
  onUpdate: (grouperId: number, percentage: number | null) => Promise<void>;
};

function PercentageInput({
  grouper,
  estudioId,
  onUpdate,
}: PercentageInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(grouper.percentage?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const numValue = value.trim() === '' ? null : parseFloat(value);
      if (
        numValue !== null &&
        (isNaN(numValue) || numValue < 0 || numValue > 100)
      ) {
        toast({
          title: 'Error',
          description: 'El porcentaje debe ser un número entre 0 y 100',
          variant: 'destructive',
        });
        return;
      }

      await onUpdate(grouper.id, numValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating percentage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setValue(grouper.percentage?.toString() || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-20"
          placeholder="0.00"
          disabled={isLoading}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isLoading}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isLoading}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-12">
        {grouper.percentage !== null && grouper.percentage !== undefined
          ? `${grouper.percentage}%`
          : '-'}
      </span>
      <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
        <Edit3 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function EstudioGroupersPage() {
  const params = useParams();
  const router = useRouter();
  const estudioId = parseInt(params.id as string);

  const [estudioData, setEstudioData] = useState<EstudioData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState<boolean>(false);
  const [selectedGroupersToAdd, setSelectedGroupersToAdd] = useState<number[]>(
    []
  );
  const [grouperToRemove, setGrouperToRemove] = useState<Grouper | null>(null);

  // Payment methods state management
  const [paymentMethodsState, setPaymentMethodsState] = useState<
    Record<number, string[]>
  >({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingPaymentMethods, setIsSavingPaymentMethods] = useState(false);

  // Payment method validation state
  const [paymentMethodValidationErrors, setPaymentMethodValidationErrors] =
    useState<Record<number, string[]>>({});
  const [hasValidationErrors, setHasValidationErrors] = useState(false);

  // API error handling
  const {
    isLoading: isApiLoading,
    error: apiError,
    clearError: clearApiError,
    handleApiCall,
    canRetry,
    retry,
  } = usePaymentMethodApi({
    onSuccess: (data) => {
      console.log('Payment method operation successful:', data);
    },
    onError: (error) => {
      console.error('Payment method API error:', error);
    },
  });

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Fetch estudio and groupers data with retry mechanism
  const fetchData = async (isRetry = false) => {
    if (isNaN(estudioId)) {
      toast({
        title: 'Error',
        description: 'ID de estudio inválido',
        variant: 'destructive',
      });
      router.push('/estudios');
      return;
    }

    try {
      setIsLoading(true);
      if (!isRetry) {
        setFetchError(null);
      }

      // Fetch estudio details
      const estudioResponse = await fetch(`/api/estudios/${estudioId}`);
      if (!estudioResponse.ok) {
        if (estudioResponse.status === 404) {
          toast({
            title: 'Estudio no encontrado',
            description: 'El estudio solicitado no existe o ha sido eliminado',
            variant: 'destructive',
          });
          router.push('/estudios');
          return;
        }
        const error = await estudioResponse.json().catch(() => ({}));
        throw new Error(
          error.error ||
            `Error ${estudioResponse.status}: ${estudioResponse.statusText}`
        );
      }
      const estudio = await estudioResponse.json();

      // Fetch groupers data
      const groupersResponse = await fetch(
        `/api/estudios/${estudioId}/groupers`
      );
      if (!groupersResponse.ok) {
        const error = await groupersResponse.json().catch(() => ({}));
        throw new Error(
          error.error ||
            `Error ${groupersResponse.status}: ${groupersResponse.statusText}`
        );
      }
      const groupersData = await groupersResponse.json();

      setEstudioData({
        id: estudio.id,
        name: estudio.name,
        assignedGroupers: groupersData.assignedGroupers,
        availableGroupers: groupersData.availableGroupers,
      });

      // Initialize payment methods state
      const initialPaymentMethods: Record<number, string[]> = {};
      groupersData.assignedGroupers.forEach((grouper: Grouper) => {
        initialPaymentMethods[grouper.id] = grouper.payment_methods || [];
      });
      setPaymentMethodsState(initialPaymentMethods);
      setHasUnsavedChanges(false);

      setFetchError(null);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes('fetch')
            ? 'Error de conexión. Verifique su conexión a internet.'
            : error.message
          : 'Ocurrió un error desconocido';

      setFetchError(errorMessage);

      if (!isRetry) {
        toast({
          title: 'Error al cargar datos',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Retry function with exponential backoff
  const retryFetchData = async () => {
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
      fetchData(true);
    }, delay);
  };

  useEffect(() => {
    fetchData();
  }, [estudioId, router]);

  const [isAddingGroupers, setIsAddingGroupers] = useState(false);

  // Add selected groupers to estudio with enhanced error handling
  const handleAddGroupers = async () => {
    if (selectedGroupersToAdd.length === 0) {
      toast({
        title: 'Selección requerida',
        description: 'Debe seleccionar al menos un agrupador',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAddingGroupers(true);

      const response = await fetch(`/api/estudios/${estudioId}/groupers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grouperIds: selectedGroupersToAdd }),
      });

      if (response.ok) {
        const result = await response.json();

        // Refresh data
        const groupersResponse = await fetch(
          `/api/estudios/${estudioId}/groupers`
        );

        if (groupersResponse.ok) {
          const groupersData = await groupersResponse.json();

          setEstudioData((prev) =>
            prev
              ? {
                  ...prev,
                  assignedGroupers: groupersData.assignedGroupers,
                  availableGroupers: groupersData.availableGroupers,
                }
              : null
          );

          // Update payment methods state for new groupers
          const updatedPaymentMethods: Record<number, string[]> = {
            ...paymentMethodsState,
          };
          groupersData.assignedGroupers.forEach((grouper: Grouper) => {
            if (!(grouper.id in updatedPaymentMethods)) {
              updatedPaymentMethods[grouper.id] = grouper.payment_methods || [];
            }
          });
          setPaymentMethodsState(updatedPaymentMethods);

          setSelectedGroupersToAdd([]);
          setIsAddDialogOpen(false);

          const message =
            result.skipped > 0
              ? `Se agregaron ${result.added} agrupadores. ${result.skipped} ya estaban asignados.`
              : `Se agregaron ${result.added} agrupadores al estudio.`;

          toast({
            title: 'Agrupadores agregados',
            description: message,
          });
        } else {
          throw new Error('Error al actualizar la lista de agrupadores');
        }
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          error.error || `Error ${response.status}: ${response.statusText}`;

        toast({
          title: 'Error al agregar agrupadores',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding groupers:', error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes('fetch')
            ? 'Error de conexión. Verifique su conexión a internet.'
            : error.message
          : 'No se pudieron agregar los agrupadores';

      toast({
        title: 'Error al agregar agrupadores',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAddingGroupers(false);
    }
  };

  const [isRemovingGrouper, setIsRemovingGrouper] = useState(false);

  // Remove grouper from estudio with enhanced error handling
  const handleRemoveGrouper = async () => {
    if (!grouperToRemove) return;

    try {
      setIsRemovingGrouper(true);

      const response = await fetch(
        `/api/estudios/${estudioId}/groupers/${grouperToRemove.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        const result = await response.json();

        // Refresh data
        const groupersResponse = await fetch(
          `/api/estudios/${estudioId}/groupers`
        );

        if (groupersResponse.ok) {
          const groupersData = await groupersResponse.json();

          setEstudioData((prev) =>
            prev
              ? {
                  ...prev,
                  assignedGroupers: groupersData.assignedGroupers,
                  availableGroupers: groupersData.availableGroupers,
                }
              : null
          );

          // Remove payment methods state for removed grouper
          if (grouperToRemove) {
            setPaymentMethodsState((prev) => {
              const updated = { ...prev };
              delete updated[grouperToRemove.id];
              return updated;
            });
          }

          setIsRemoveDialogOpen(false);
          setGrouperToRemove(null);

          toast({
            title: 'Agrupador removido',
            description: `El agrupador "${
              result.removedGrouper?.name || grouperToRemove.name
            }" ha sido removido del estudio.`,
          });
        } else {
          throw new Error('Error al actualizar la lista de agrupadores');
        }
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          error.error || `Error ${response.status}: ${response.statusText}`;

        toast({
          title: 'Error al remover agrupador',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error removing grouper:', error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes('fetch')
            ? 'Error de conexión. Verifique su conexión a internet.'
            : error.message
          : 'No se pudo remover el agrupador';

      toast({
        title: 'Error al remover agrupador',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRemovingGrouper(false);
    }
  };

  // Handle checkbox selection for adding groupers
  const handleGrouperSelection = (grouperId: number, checked: boolean) => {
    if (checked) {
      setSelectedGroupersToAdd((prev) => [...prev, grouperId]);
    } else {
      setSelectedGroupersToAdd((prev) => prev.filter((id) => id !== grouperId));
    }
  };

  // Handle payment method changes with validation
  const handlePaymentMethodChange = (grouperId: number, methods: string[]) => {
    try {
      setPaymentMethodsState((prev) => ({
        ...prev,
        [grouperId]: methods,
      }));
      setHasUnsavedChanges(true);

      // Clear any existing validation errors for this grouper
      setPaymentMethodValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[grouperId];
        return updated;
      });
    } catch (error) {
      console.error('Error updating payment methods:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar los métodos de pago',
        variant: 'destructive',
      });
    }
  };

  // Handle payment method validation changes
  const handlePaymentMethodValidation = (
    grouperId: number,
    isValid: boolean,
    errors: string[]
  ) => {
    setPaymentMethodValidationErrors((prev) => ({
      ...prev,
      [grouperId]: errors,
    }));

    // Update global validation state
    const allErrors = Object.values({
      ...paymentMethodValidationErrors,
      [grouperId]: errors,
    });
    setHasValidationErrors(allErrors.some((errorList) => errorList.length > 0));
  };

  // Save all payment method changes with enhanced error handling
  const handleSavePaymentMethods = async () => {
    if (!estudioData || !hasUnsavedChanges) return;

    // Check for validation errors before saving
    if (hasValidationErrors) {
      toast({
        title: 'Errores de validación',
        description: 'Corrige los errores de validación antes de guardar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingPaymentMethods(true);
    clearApiError(); // Clear any previous API errors
    let successCount = 0;
    let errorCount = 0;
    const failedGroupers: string[] = [];

    try {
      // Save payment methods for each grouper that has changes
      const savePromises = estudioData.assignedGroupers.map(async (grouper) => {
        const currentMethods = paymentMethodsState[grouper.id] || [];
        const originalMethods = grouper.payment_methods || [];

        // Check if methods have changed
        const methodsChanged =
          JSON.stringify(currentMethods.sort()) !==
          JSON.stringify(originalMethods.sort());

        if (methodsChanged) {
          const result = await handleApiCall(async () => {
            return fetch(`/api/estudios/${estudioId}/groupers/${grouper.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                percentage: grouper.percentage,
                payment_methods:
                  currentMethods.length === 0 ? null : currentMethods,
              }),
            });
          });

          if (result.success) {
            successCount++;
            return {
              success: true,
              grouperId: grouper.id,
              grouperName: grouper.name,
            };
          } else {
            errorCount++;
            failedGroupers.push(grouper.name);
            return {
              success: false,
              grouperId: grouper.id,
              grouperName: grouper.name,
              error: result.error,
            };
          }
        }
        return { success: true, grouperId: grouper.id, skipped: true };
      });

      const results = await Promise.all(savePromises);
      const successfulResults = results.filter((r) => r.success && !r.skipped);

      if (successfulResults.length > 0) {
        // Update the estudio data with new payment methods
        setEstudioData((prev) =>
          prev
            ? {
                ...prev,
                assignedGroupers: prev.assignedGroupers.map((grouper) => ({
                  ...grouper,
                  payment_methods: paymentMethodsState[grouper.id] || [],
                })),
              }
            : null
        );

        setHasUnsavedChanges(false);
        setPaymentMethodValidationErrors({}); // Clear validation errors

        toast({
          title: 'Métodos de pago guardados',
          description: `Se actualizaron los métodos de pago para ${successCount} agrupadores.`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: 'Algunos cambios no se pudieron guardar',
          description: `Error en agrupadores: ${failedGroupers.join(', ')}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving payment methods:', error);
      toast({
        title: 'Error al guardar',
        description:
          'No se pudieron guardar los métodos de pago. Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPaymentMethods(false);
    }
  };

  // Handle percentage updates for assigned groupers
  const handlePercentageUpdate = async (
    grouperId: number,
    percentage: number | null
  ) => {
    try {
      const currentPaymentMethods = paymentMethodsState[grouperId] || [];
      const response = await fetch(
        `/api/estudios/${estudioId}/groupers/${grouperId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            percentage,
            payment_methods:
              currentPaymentMethods.length === 0 ? null : currentPaymentMethods,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Update the local state to reflect the change
        setEstudioData((prev) =>
          prev
            ? {
                ...prev,
                assignedGroupers: prev.assignedGroupers.map((grouper) =>
                  grouper.id === grouperId
                    ? { ...grouper, percentage }
                    : grouper
                ),
              }
            : null
        );

        toast({
          title: 'Porcentaje actualizado',
          description: result.message,
        });
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          error.error || `Error ${response.status}: ${response.statusText}`;

        toast({
          title: 'Error al actualizar porcentaje',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating percentage:', error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes('fetch')
            ? 'Error de conexión. Verifique su conexión a internet.'
            : error.message
          : 'No se pudo actualizar el porcentaje';

      toast({
        title: 'Error al actualizar porcentaje',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="py-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
            <span>Cargando datos del estudio...</span>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container mx-auto py-6">
        <div className="py-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-destructive">
              <AlertCircle className="mx-auto mb-2 h-12 w-12" />
              <p className="font-medium">Error al cargar datos</p>
              <p className="mt-1 text-sm text-muted-foreground">{fetchError}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={retryFetchData}
                variant="outline"
                disabled={retryCount >= maxRetries}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {retryCount >= maxRetries
                  ? 'Máximo de reintentos alcanzado'
                  : 'Reintentar'}
              </Button>
              <Button
                onClick={() => router.push('/estudios')}
                variant="default"
              >
                Volver a estudios
              </Button>
            </div>
            {retryCount >= maxRetries && (
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
              >
                Recargar página
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!estudioData) {
    return (
      <div className="container mx-auto py-6">
        <div className="py-8 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">Estudio no encontrado</h3>
          <p className="mb-4 text-muted-foreground">
            El estudio solicitado no existe o ha sido eliminado.
          </p>
          <Button onClick={() => router.push('/estudios')}>
            Volver a estudios
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/estudios">Estudios</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{estudioData.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/estudios')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <BookOpen className="h-6 w-6" />
          <h1 className="text-3xl font-bold">
            Agrupadores - {estudioData.name}
          </h1>
        </div>
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <Button
              onClick={handleSavePaymentMethods}
              disabled={
                isSavingPaymentMethods || isApiLoading || hasValidationErrors
              }
              variant={hasValidationErrors ? 'secondary' : 'default'}
            >
              {isSavingPaymentMethods || isApiLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : hasValidationErrors ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Corregir Errores
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            disabled={estudioData.availableGroupers.length === 0}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Agrupadores
          </Button>
        </div>
      </div>

      {/* API Error Display */}
      {apiError && (
        <div className="mb-4">
          <PaymentMethodErrorHandler
            error={apiError}
            onRetry={
              canRetry
                ? () =>
                    retry(() => fetch(`/api/estudios/${estudioId}/groupers`))
                : undefined
            }
            onClear={clearApiError}
            canRetry={canRetry}
          />
        </div>
      )}

      {/* Validation Errors Warning */}
      {hasValidationErrors && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Hay errores de validación en los métodos de pago. Corrige los
                errores antes de guardar.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && !hasValidationErrors && (
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Tienes cambios sin guardar en los métodos de pago. No olvides
                guardar tus cambios.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Groupers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Agrupadores Asignados</CardTitle>
          <CardDescription>
            Agrupadores que pertenecen a este estudio. Configura los métodos de
            pago para cada agrupador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {estudioData.assignedGroupers.length === 0 ? (
            <div className="py-4 text-center">
              No hay agrupadores asignados a este estudio.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Porcentaje (%)</TableHead>
                  <TableHead>Métodos de Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estudioData.assignedGroupers.map((grouper) => (
                  <TableRow key={grouper.id}>
                    <TableCell className="font-medium">
                      {grouper.name}
                    </TableCell>
                    <TableCell>
                      <PercentageInput
                        grouper={grouper}
                        estudioId={estudioId}
                        onUpdate={handlePercentageUpdate}
                      />
                    </TableCell>
                    <TableCell className="w-80">
                      <PaymentMethodErrorBoundary>
                        <PaymentMethodTableSelector
                          selectedMethods={
                            paymentMethodsState[grouper.id] || []
                          }
                          onSelectionChange={(methods) =>
                            handlePaymentMethodChange(grouper.id, methods)
                          }
                          disabled={isSavingPaymentMethods || isApiLoading}
                          hasUnsavedChanges={
                            JSON.stringify(
                              (paymentMethodsState[grouper.id] || []).sort()
                            ) !==
                            JSON.stringify(
                              (grouper.payment_methods || []).sort()
                            )
                          }
                          validationError={paymentMethodValidationErrors[
                            grouper.id
                          ]?.join(', ')}
                          onValidationChange={(isValid, errors) =>
                            handlePaymentMethodValidation(
                              grouper.id,
                              isValid,
                              errors
                            )
                          }
                        />
                      </PaymentMethodErrorBoundary>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGrouperToRemove(grouper);
                          setIsRemoveDialogOpen(true);
                        }}
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

      {/* Add Groupers Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setSelectedGroupersToAdd([]);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Agrupadores</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {estudioData.availableGroupers.length === 0 ? (
              <div className="py-4 text-center">
                No hay agrupadores disponibles para agregar.
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {estudioData.availableGroupers.map((grouper) => (
                  <div key={grouper.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`grouper-${grouper.id}`}
                      checked={selectedGroupersToAdd.includes(grouper.id)}
                      onCheckedChange={(checked) =>
                        handleGrouperSelection(grouper.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`grouper-${grouper.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {grouper.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddGroupers}
              disabled={selectedGroupersToAdd.length === 0 || isAddingGroupers}
            >
              {isAddingGroupers ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Agregando...
                </>
              ) : (
                `Agregar (${selectedGroupersToAdd.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Remoción</DialogTitle>
          </DialogHeader>
          <p>
            ¿Está seguro de que desea remover el agrupador "
            {grouperToRemove?.name}" de este estudio?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRemoveGrouper}
              variant="destructive"
              disabled={isRemovingGrouper}
            >
              {isRemovingGrouper ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Removiendo...
                </>
              ) : (
                'Remover'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
