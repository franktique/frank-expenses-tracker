"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await login(password)
      if (success) {
        toast({
          title: "Autenticación exitosa",
          description: "Bienvenido a tu seguimiento de gastos",
        })
        router.push("/")
      } else {
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "La contraseña es incorrecta. Intenta de nuevo.",
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar la solicitud de inicio de sesión.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5"></div>
      <Card className="w-full max-w-md mx-auto z-10 shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Control de Gastos</CardTitle>
          <CardDescription>
            Ingresa tu contraseña para acceder a la aplicación
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Validando..." : "Ingresar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
