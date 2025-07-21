"use client"

import { useState } from "react"
import { AlertCircle, Database, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useBudget } from "@/context/budget-context-provider"
import { useToast } from "@/components/ui/use-toast"

export function SetupDatabaseButton() {
  const { setupDatabase, isDbInitialized, isLoading, dbConnectionError, connectionErrorDetails } = useBudget()
  const { toast } = useToast()
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  const handleSetupDatabase = async () => {
    setIsSettingUp(true)
    setSetupError(null)
    try {
      await setupDatabase()
      toast({
        title: "Base de datos configurada",
        description: "Las tablas de la base de datos han sido creadas exitosamente.",
      })
    } catch (error) {
      setSetupError((error as Error).message)
      toast({
        title: "Error",
        description: `Error al configurar la base de datos: ${(error as Error).message}`,
        variant: "destructive",
      })
    } finally {
      setIsSettingUp(false)
    }
  }

  if (isLoading) {
    return (
      <Button disabled className="w-full">
        <Database className="mr-2 h-4 w-4" />
        Verificando estado...
      </Button>
    )
  }

  if (dbConnectionError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de conexión a la base de datos</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>No se pudo conectar a la base de datos. Verifica la configuración de tu base de datos Neon.</p>
            {connectionErrorDetails && (
              <div className="text-xs bg-destructive/10 p-2 rounded overflow-auto">
                <p className="font-mono break-all whitespace-pre-wrap">{connectionErrorDetails}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
        <div className="flex flex-col space-y-2">
          <Button onClick={handleSetupDatabase} disabled={isSettingUp} className="w-full">
            <Database className="mr-2 h-4 w-4" />
            {isSettingUp ? "Intentando conectar..." : "Intentar conectar"}
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <a href="https://console.neon.tech" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir al panel de Neon
            </a>
          </Button>
        </div>
      </div>
    )
  }

  if (isDbInitialized) {
    return (
      <div className="text-green-600 dark:text-green-400 flex items-center">
        <Database className="mr-2 h-4 w-4" />
        Base de datos ya configurada
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {setupError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al configurar la base de datos</AlertTitle>
          <AlertDescription className="break-all whitespace-pre-wrap">{setupError}</AlertDescription>
        </Alert>
      )}
      <Button onClick={handleSetupDatabase} disabled={isSettingUp} className="w-full">
        <Database className="mr-2 h-4 w-4" />
        {isSettingUp ? "Configurando..." : "Configurar Base de Datos"}
      </Button>
    </div>
  )
}
