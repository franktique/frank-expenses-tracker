import { ManualDbConfig } from '@/components/manual-db-config';
import { SetupDatabaseButton } from '@/components/setup-database-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SetupPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold">Configuración Inicial</h1>

        <Tabs defaultValue="auto" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto">Configuración Automática</TabsTrigger>
            <TabsTrigger value="manual">Configuración Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="auto">
            <Card>
              <CardHeader>
                <CardTitle>Base de Datos</CardTitle>
                <CardDescription>
                  Antes de comenzar a usar la aplicación, es necesario
                  configurar la base de datos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SetupDatabaseButton />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Configuración Manual de Neon</CardTitle>
                <CardDescription>
                  Configura manualmente la conexión a tu base de datos Neon
                  proporcionando la cadena de conexión.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManualDbConfig />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Solución de problemas</CardTitle>
            <CardDescription>
              Pasos para resolver problemas de conexión a la base de datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">
                1. Verifica las variables de entorno
              </h3>
              <p className="text-sm text-muted-foreground">
                Asegúrate de que la variable de entorno DATABASE_URL esté
                correctamente configurada en tu proyecto de Vercel. Esta
                variable debe contener la URL de conexión a tu base de datos
                Neon.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Formato esperado:{' '}
                <code className="rounded bg-muted px-1 py-0.5">
                  postgres://username:password@hostname/database
                </code>
              </p>
            </div>

            <div>
              <h3 className="font-medium">2. Verifica el estado de Neon</h3>
              <p className="text-sm text-muted-foreground">
                Verifica que tu base de datos Neon esté activa y funcionando
                correctamente. Puedes verificar el estado de tu base de datos en
                el panel de control de Neon.
              </p>
            </div>

            <div>
              <h3 className="font-medium">3. Problemas comunes</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  <strong>Control plane request failed</strong>: Este error
                  puede ocurrir cuando hay problemas con la conexión a Neon.
                  Verifica que la URL de conexión sea correcta y que tu proyecto
                  de Neon esté activo.
                </li>
                <li>
                  <strong>Connection refused</strong>: Asegúrate de que no haya
                  restricciones de IP en tu base de datos que estén bloqueando
                  las conexiones desde Vercel.
                </li>
                <li>
                  <strong>Authentication failed</strong>: Verifica que el nombre
                  de usuario y la contraseña en la URL de conexión sean
                  correctos.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium">4. Configuración manual</h3>
              <p className="text-sm text-muted-foreground">
                Si los métodos automáticos no funcionan, puedes usar la opción
                de "Configuración Manual" para proporcionar directamente la
                cadena de conexión de tu base de datos Neon.
              </p>
            </div>

            <div>
              <h3 className="font-medium">5. Reinicia el proyecto</h3>
              <p className="text-sm text-muted-foreground">
                Si has verificado los pasos anteriores y sigues teniendo
                problemas, intenta reiniciar el proyecto. Esto puede resolver
                problemas temporales de conexión.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
