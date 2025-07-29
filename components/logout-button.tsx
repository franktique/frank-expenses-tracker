"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      setIsLoading(true);

      // Call logout function from AuthContext
      logout();

      // Show success toast notification
      toast({
        title: "Sesión cerrada exitosamente",
        description: "Has cerrado sesión correctamente",
        variant: "default",
      });

      // Redirect to login page
      router.push("/login");
    } catch (error) {
      // Handle logout errors
      console.error("Error during logout:", error);

      // Show error toast notification
      toast({
        title: "Error al cerrar sesión",
        description:
          "Ocurrió un error al cerrar la sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });

      // Force redirect to login even if there's an error
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            aria-label={
              isLoading
                ? "Cerrando sesión, por favor espera"
                : "Cerrar sesión y volver al login"
            }
            aria-describedby="logout-tooltip"
            onKeyDown={(e) => {
              // Enhanced keyboard navigation support
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isLoading) {
                  handleLogout();
                }
              }
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{isLoading ? "Cerrando..." : "Cerrar Sesión"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent id="logout-tooltip" side="right" align="center">
          <p>
            {isLoading
              ? "Cerrando sesión..."
              : "Cerrar sesión y regresar a la pantalla de login"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
