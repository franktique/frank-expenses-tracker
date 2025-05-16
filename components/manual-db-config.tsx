"use client"

import { useState } from "react"
import { AlertCircle, Database, ExternalLink, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useBudget } from "@/context/budget-context"

export function ManualDbConfig() {
  const { refreshData } = useBudget()
  const { toast } = useToast()
  const [connectionString, setConnectionString] = useState("")
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [showConnectionString, setShowConnectionString] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)

  const handleReconfigureDb = async () => {
    if (!connectionString.trim()) {
      toast({
        title: "Error",
        description: "La cadena de conexión no puede estar vacía",
        variant: "destructive",
      })
      return
    }

    setIsConfiguring(true)
    setConfigError(null)
    setIsRateLimited(false)

    try {
      const response = await fetch("/api/reconfigure-db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionString }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        // Check if it's a rate limit error
        if (
          data.error?.includes("rate limit") ||
          data.error?.includes("exceeded the rate limit") ||
          data.message?.includes("rate limit") ||
          data.message?.includes("exceeded the rate limit")
        ) {
          setIsRateLimited(true)
          throw new Error(
            "Has excedido el límite de solicitudes a Neon. Por favor, espera unos minutos e intenta nuevamente.",
          )
        }

        throw new Error(data.error || data.message || "Error al reconfigurar la base de datos")
      }

      toast({
        title: "Conexión configurada",
        description: "La conexión a la base de datos ha sido configurada exitosamente.",
      })

      // Refresh data to use the new connection
      await refreshData()
    } catch (error) {
      setConfigError((error as Error).message)
      toast({
        title: "Error",
        description: `Error al configurar la conexión: ${(error as Error).message}`,
        variant: "destructive",
      })
    } finally {
      setIsConfiguring(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="connection-string">Cadena de conexión de Neon</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="connection-string"
            type={showConnectionString ? "text" : "password"}
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            placeholder="postgres://username:password@hostname/database"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowConnectionString(!showConnectionString)}
          >
            {showConnectionString ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ingresa la cadena de conexión completa de tu base de datos Neon.
        </p>
      </div>

      {configError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al configurar la conexión</AlertTitle>
          <AlertDescription className="break-all whitespace-pre-wrap">{configError}</AlertDescription>
        </Alert>
      )}

      {isRateLimited && (
        <Alert
          variant="warning"
          className="bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-900 dark:text-yellow-200"
        >
          <RefreshCw className="h-4 w-4" />
          <AlertTitle>Límite de tasa excedido</AlertTitle>
          <AlertDescription>
            <p>Has excedido el límite de solicitudes a Neon. Esto es común en el plan gratuito.</p>
            <p className="mt-2">Recomendaciones:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Espera unos minutos antes de intentar nuevamente</li>
              <li>Reduce la frecuencia de solicitudes</li>
              <li>Considera actualizar a un plan de pago si necesitas hacer muchas operaciones</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col space-y-2">
        <Button onClick={handleReconfigureDb} disabled={isConfiguring || !connectionString.trim()}>
          <Database className="mr-2 h-4 w-4" />
          {isConfiguring ? "Configurando..." : "Configurar Conexión"}
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <a href="https://console.neon.tech" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ir al panel de Neon
          </a>
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Formato de la cadena de conexión</AlertTitle>
        <AlertDescription>
          <p className="text-sm">La cadena de conexión debe tener el siguiente formato:</p>
          <code className="text-xs bg-muted p-1 rounded block mt-1">
            postgres://username:password@hostname/database
          </code>
          <p className="text-sm mt-2">
            Puedes obtener esta cadena desde el panel de control de Neon, en la sección de conexiones.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
