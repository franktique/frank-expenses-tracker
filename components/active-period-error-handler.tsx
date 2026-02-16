'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  RefreshCw,
  CalendarRange,
  LogIn,
  Wifi,
  Server,
  Clock,
  Settings,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PeriodLoadingError } from '@/lib/active-period-service';

interface ActivePeriodErrorHandlerProps {
  error: PeriodLoadingError;
  onRetry?: () => void;
  isRetrying?: boolean;
  showFullCard?: boolean;
  className?: string;
}

export function ActivePeriodErrorHandler({
  error,
  onRetry,
  isRetrying = false,
  showFullCard = true,
  className = '',
}: ActivePeriodErrorHandlerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <Wifi className="h-4 w-4" />;
      case 'authentication':
        return <LogIn className="h-4 w-4" />;
      case 'no_active_period':
        return <CalendarRange className="h-4 w-4" />;
      case 'server':
        return <Server className="h-4 w-4" />;
      case 'timeout':
        return <Clock className="h-4 w-4" />;
      case 'invalid_cache':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Error de conexión';
      case 'authentication':
        return 'Sesión expirada';
      case 'no_active_period':
        return 'No hay periodo activo';
      case 'server':
        return 'Error del servidor';
      case 'timeout':
        return 'Tiempo de espera agotado';
      case 'invalid_cache':
        return 'Datos desactualizados';
      default:
        return 'Error desconocido';
    }
  };

  const getErrorDescription = () => {
    switch (error.type) {
      case 'network':
        return 'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.';
      case 'authentication':
        return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.';
      case 'no_active_period':
        return 'No hay un periodo activo configurado. Necesitas activar un periodo para ver los datos.';
      case 'server':
        return 'Ocurrió un error en el servidor. Intenta nuevamente en unos momentos.';
      case 'timeout':
        return 'La operación tardó demasiado tiempo. Verifica tu conexión e intenta nuevamente.';
      case 'invalid_cache':
        return 'Los datos almacenados están desactualizados. Se están recargando automáticamente.';
      default:
        return (
          error.message ||
          'Ocurrió un error inesperado al cargar el periodo activo.'
        );
    }
  };

  const getActionButtons = () => {
    const buttons = [];

    // Retry button for retryable errors
    if (error.retryable && onRetry) {
      buttons.push(
        <Button
          key="retry"
          onClick={onRetry}
          disabled={isRetrying}
          variant="default"
          size="sm"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Reintentando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </>
          )}
        </Button>
      );
    }

    // Specific action buttons based on error type
    switch (error.type) {
      case 'authentication':
        buttons.push(
          <Button
            key="login"
            onClick={() => router.push('/login')}
            variant="outline"
            size="sm"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Iniciar sesión
          </Button>
        );
        break;

      case 'no_active_period':
        buttons.push(
          <Button
            key="periods"
            onClick={() => router.push('/periodos')}
            variant="outline"
            size="sm"
          >
            <CalendarRange className="mr-2 h-4 w-4" />
            Ir a Periodos
          </Button>
        );
        break;

      case 'server':
      case 'timeout':
        buttons.push(
          <Button
            key="setup"
            onClick={() => router.push('/setup')}
            variant="outline"
            size="sm"
          >
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </Button>
        );
        break;
    }

    return buttons;
  };

  const handleDismiss = () => {
    toast({
      title: 'Error reconocido',
      description:
        'El error ha sido reconocido. Puedes continuar usando la aplicación.',
    });
  };

  if (!showFullCard) {
    // Compact alert version
    return (
      <Alert variant="destructive" className={className}>
        {getErrorIcon()}
        <AlertTitle>{getErrorTitle()}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{getErrorDescription()}</p>
          {getActionButtons().length > 0 && (
            <div className="mt-2 flex gap-2">{getActionButtons()}</div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Full card version
  return (
    <Card className={`border-destructive ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          {getErrorIcon()}
          {getErrorTitle()}
        </CardTitle>
        <CardDescription>{getErrorDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error details */}
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Tipo de error:</strong> {error.type}
          </p>
          <p>
            <strong>Hora:</strong>{' '}
            {new Date(error.timestamp).toLocaleString('es-CO', {
              timeZone: 'America/Bogota',
            })}
          </p>
          {error.retryable && (
            <p>
              <strong>Reintentable:</strong> Sí
            </p>
          )}
        </div>

        {/* Action buttons */}
        {getActionButtons().length > 0 && (
          <div className="flex flex-wrap gap-2">{getActionButtons()}</div>
        )}

        {/* Troubleshooting tips */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Sugerencias:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {error.type === 'network' && (
              <>
                <li>• Verifica tu conexión a internet</li>
                <li>• Intenta recargar la página</li>
                <li>
                  • Verifica si hay problemas con tu proveedor de internet
                </li>
              </>
            )}
            {error.type === 'authentication' && (
              <>
                <li>• Cierra sesión e inicia sesión nuevamente</li>
                <li>• Verifica que tu contraseña sea correcta</li>
                <li>
                  • Limpia las cookies del navegador si persiste el problema
                </li>
              </>
            )}
            {error.type === 'no_active_period' && (
              <>
                <li>• Ve a la sección de Periodos</li>
                <li>• Crea un nuevo periodo si no existe ninguno</li>
                <li>• Activa un periodo existente haciendo clic en "Abrir"</li>
              </>
            )}
            {(error.type === 'server' || error.type === 'timeout') && (
              <>
                <li>• Espera unos momentos e intenta nuevamente</li>
                <li>• Verifica el estado de la base de datos</li>
                <li>• Contacta al administrador si el problema persiste</li>
              </>
            )}
            {error.type === 'invalid_cache' && (
              <>
                <li>• Los datos se están actualizando automáticamente</li>
                <li>• Recarga la página si el problema persiste</li>
                <li>• Limpia el caché del navegador si es necesario</li>
              </>
            )}
          </ul>
        </div>

        {/* Dismiss button for non-critical errors */}
        {!['authentication', 'no_active_period'].includes(error.type) && (
          <div className="border-t pt-2">
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              Continuar sin periodo activo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
