"use client";

import { useState, useEffect } from "react";
import {
  PlusCircle,
  CreditCard as CreditCardIcon,
  AlertTriangle,
  Power,
  PowerOff,
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard,
  CreditCardFranchise,
  CreateCreditCardSchema,
  UpdateCreditCardStatusSchema,
  CREDIT_CARD_FRANCHISE_LABELS,
  CREDIT_CARD_ERROR_MESSAGES,
} from "@/types/credit-cards";

export function CreditCardsView() {
  const { toast } = useToast();

  // State management
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form state for adding new credit card
  const [newCardBankName, setNewCardBankName] = useState("");
  const [newCardFranchise, setNewCardFranchise] = useState<
    CreditCardFranchise | ""
  >("");
  const [newCardLastFourDigits, setNewCardLastFourDigits] = useState("");

  // Form state for editing credit card
  const [editCard, setEditCard] = useState<CreditCard | null>(null);
  const [editCardBankName, setEditCardBankName] = useState("");
  const [editCardFranchise, setEditCardFranchise] = useState<
    CreditCardFranchise | ""
  >("");
  const [editCardLastFourDigits, setEditCardLastFourDigits] = useState("");

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteValidation, setDeleteValidation] = useState<{
    hasExpenses: boolean;
    expenseCount: number;
  } | null>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load credit cards on component mount
  useEffect(() => {
    loadCreditCards();
  }, []);

  const loadCreditCards = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/credit-cards");
      if (!response.ok) {
        throw new Error("Failed to load credit cards");
      }
      const data = await response.json();
      setCreditCards(data.credit_cards || []);
    } catch (error) {
      console.error("Error loading credit cards:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tarjetas de crédito",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetNewCardForm = () => {
    setNewCardBankName("");
    setNewCardFranchise("");
    setNewCardLastFourDigits("");
  };

  const resetEditCardForm = () => {
    setEditCard(null);
    setEditCardBankName("");
    setEditCardFranchise("");
    setEditCardLastFourDigits("");
  };

  const handleAddCreditCard = async () => {
    try {
      // Validate form data
      const validationResult = CreateCreditCardSchema.safeParse({
        bank_name: newCardBankName.trim(),
        franchise: newCardFranchise,
        last_four_digits: newCardLastFourDigits.trim(),
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Error de validación",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      const response = await fetch("/api/credit-cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validationResult.data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create credit card");
      }

      await loadCreditCards();
      resetNewCardForm();
      setIsAddOpen(false);

      toast({
        title: "Tarjeta agregada",
        description: CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_CREATE_SUCCESS,
      });
    } catch (error) {
      console.error("Error adding credit card:", error);
      toast({
        title: "Error",
        description:
          (error as Error).message ||
          "No se pudo agregar la tarjeta de crédito",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCreditCard = async () => {
    if (!editCard) return;

    try {
      // Validate form data
      const validationResult = CreateCreditCardSchema.safeParse({
        bank_name: editCardBankName.trim(),
        franchise: editCardFranchise,
        last_four_digits: editCardLastFourDigits.trim(),
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Error de validación",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      const response = await fetch(`/api/credit-cards/${editCard.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validationResult.data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update credit card");
      }

      await loadCreditCards();
      resetEditCardForm();
      setIsEditOpen(false);

      toast({
        title: "Tarjeta actualizada",
        description: CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_UPDATE_SUCCESS,
      });
    } catch (error) {
      console.error("Error updating credit card:", error);
      toast({
        title: "Error",
        description:
          (error as Error).message ||
          "No se pudo actualizar la tarjeta de crédito",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateCreditCardDeletion = async (creditCardId: string) => {
    try {
      // Check if credit card has associated expenses
      const response = await fetch(
        `/api/expenses?credit_card_id=${creditCardId}`
      );
      if (response.ok) {
        const expenses = await response.json();
        const expenseCount = expenses.length;

        return {
          hasExpenses: expenseCount > 0,
          expenseCount,
        };
      }

      return {
        hasExpenses: false,
        expenseCount: 0,
      };
    } catch (error) {
      console.error("Error validating credit card deletion:", error);
      return {
        hasExpenses: false,
        expenseCount: 0,
      };
    }
  };

  const handleDeleteCreditCard = async () => {
    if (!deleteId) return;

    try {
      // Validate deletion first
      const validation = await validateCreditCardDeletion(deleteId);
      setDeleteValidation(validation);

      if (validation.hasExpenses) {
        // Show confirmation dialog for credit cards with expenses
        setIsDeleteOpen(false);
        setIsDeleteConfirmOpen(true);
        return;
      }

      // Proceed with deletion if no expenses
      await performCreditCardDeletion(deleteId);
    } catch (error) {
      console.error("Error deleting credit card:", error);
      toast({
        title: "Error",
        description:
          (error as Error).message ||
          "No se pudo eliminar la tarjeta de crédito",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await performCreditCardDeletion(deleteId);
      setIsDeleteConfirmOpen(false);
      setDeleteValidation(null);
    } catch (error) {
      console.error("Error deleting credit card:", error);
      toast({
        title: "Error",
        description:
          (error as Error).message ||
          "No se pudo eliminar la tarjeta de crédito",
        variant: "destructive",
      });
    }
  };

  const performCreditCardDeletion = async (creditCardId: string) => {
    const response = await fetch(`/api/credit-cards/${creditCardId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete credit card");
    }

    await loadCreditCards();
    setDeleteId(null);
    setIsDeleteOpen(false);

    toast({
      title: "Tarjeta eliminada",
      description: CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_DELETE_SUCCESS,
    });
  };

  const handleEditClick = (creditCard: CreditCard) => {
    setEditCard(creditCard);
    setEditCardBankName(creditCard.bank_name);
    setEditCardFranchise(creditCard.franchise);
    setEditCardLastFourDigits(creditCard.last_four_digits);
    setIsEditOpen(true);
  };

  const formatCreditCardDisplay = (creditCard: CreditCard) => {
    const franchiseLabel = CREDIT_CARD_FRANCHISE_LABELS[creditCard.franchise];
    return `${creditCard.bank_name} - ${franchiseLabel} ****${creditCard.last_four_digits}`;
  };

  const handleStatusToggle = async (creditCard: CreditCard) => {
    try {
      const newStatus = !creditCard.is_active;

      // Validate the status update
      const validationResult = UpdateCreditCardStatusSchema.safeParse({
        is_active: newStatus,
      });

      if (!validationResult.success) {
        toast({
          title: "Error de validación",
          description: "Estado inválido",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/credit-cards/${creditCard.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validationResult.data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update credit card status"
        );
      }

      await loadCreditCards();

      toast({
        title: newStatus ? "Tarjeta activada" : "Tarjeta desactivada",
        description: newStatus
          ? CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_ACTIVATED
          : CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_DEACTIVATED,
      });
    } catch (error) {
      console.error("Error updating credit card status:", error);
      toast({
        title: "Error",
        description:
          (error as Error).message ||
          "No se pudo actualizar el estado de la tarjeta",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Tarjetas de Crédito
          </h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">
              Cargando tarjetas de crédito...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tarjetas de Crédito
          </h1>
          <p className="text-muted-foreground mt-1">
            {creditCards.length}{" "}
            {creditCards.length === 1
              ? "tarjeta registrada"
              : "tarjetas registradas"}
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Tarjeta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Tarjeta de Crédito</DialogTitle>
              <DialogDescription>
                Ingresa los detalles de tu nueva tarjeta de crédito
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="bank-name">Nombre del Banco *</Label>
                <Input
                  id="bank-name"
                  value={newCardBankName}
                  onChange={(e) => setNewCardBankName(e.target.value)}
                  placeholder="Ej: Banco de Bogotá, Bancolombia, etc."
                  maxLength={255}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="franchise">Franquicia *</Label>
                <Select
                  value={newCardFranchise}
                  onValueChange={(value) =>
                    setNewCardFranchise(value as CreditCardFranchise)
                  }
                >
                  <SelectTrigger id="franchise">
                    <SelectValue placeholder="Selecciona la franquicia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CREDIT_CARD_FRANCHISE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-four-digits">Últimos 4 Dígitos *</Label>
                <Input
                  id="last-four-digits"
                  value={newCardLastFourDigits}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setNewCardLastFourDigits(value);
                  }}
                  placeholder="1234"
                  maxLength={4}
                />
                <p className="text-sm text-muted-foreground">
                  Solo los últimos 4 dígitos de tu tarjeta para identificarla
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  resetNewCardForm();
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleAddCreditCard} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Mis Tarjetas de Crédito
          </CardTitle>
          <CardDescription>
            Administra tus tarjetas de crédito registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {creditCards.length === 0 ? (
            <div className="text-center py-8">
              <CreditCardIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No tienes tarjetas de crédito registradas
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Primera Tarjeta
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Franquicia</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditCards
                  .slice()
                  .sort((a, b) =>
                    a.bank_name.localeCompare(b.bank_name, "es", {
                      sensitivity: "base",
                    })
                  )
                  .map((creditCard) => (
                    <TableRow
                      key={creditCard.id}
                      className={!creditCard.is_active ? "opacity-60" : ""}
                    >
                      <TableCell className="font-medium">
                        {creditCard.bank_name}
                      </TableCell>
                      <TableCell>
                        {CREDIT_CARD_FRANCHISE_LABELS[creditCard.franchise]}
                      </TableCell>
                      <TableCell className="font-mono">
                        ****{creditCard.last_four_digits}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              creditCard.is_active ? "default" : "secondary"
                            }
                            className={
                              creditCard.is_active
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : ""
                            }
                          >
                            {creditCard.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                          <Switch
                            checked={creditCard.is_active}
                            onCheckedChange={() =>
                              handleStatusToggle(creditCard)
                            }
                            aria-label={`${
                              creditCard.is_active ? "Desactivar" : "Activar"
                            } tarjeta`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(creditCard)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            setDeleteId(creditCard.id);
                            setIsDeleteOpen(true);
                          }}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarjeta de Crédito</DialogTitle>
            <DialogDescription>
              Actualiza los detalles de tu tarjeta de crédito
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-bank-name">Nombre del Banco *</Label>
              <Input
                id="edit-bank-name"
                value={editCardBankName}
                onChange={(e) => setEditCardBankName(e.target.value)}
                placeholder="Ej: Banco de Bogotá, Bancolombia, etc."
                maxLength={255}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-franchise">Franquicia *</Label>
              <Select
                value={editCardFranchise}
                onValueChange={(value) =>
                  setEditCardFranchise(value as CreditCardFranchise)
                }
              >
                <SelectTrigger id="edit-franchise">
                  <SelectValue placeholder="Selecciona la franquicia" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CREDIT_CARD_FRANCHISE_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-last-four-digits">Últimos 4 Dígitos *</Label>
              <Input
                id="edit-last-four-digits"
                value={editCardLastFourDigits}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setEditCardLastFourDigits(value);
                }}
                placeholder="1234"
                maxLength={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                resetEditCardForm();
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditCreditCard} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Tarjeta de Crédito</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta tarjeta de crédito? Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCreditCard}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog for credit cards with expenses */}
      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar eliminación
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Esta tarjeta de crédito tiene{" "}
                  <strong>{deleteValidation?.expenseCount}</strong> gastos
                  asociados.
                </p>
                <p className="text-destructive font-medium">
                  Al eliminar la tarjeta, se removerá la asociación con los
                  gastos existentes, pero los gastos se mantendrán. Esta acción
                  no se puede deshacer.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setDeleteValidation(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar tarjeta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
