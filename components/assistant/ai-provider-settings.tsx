'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type {
  AIProviderClient,
  AIProviderProtocol,
} from '@/types/ai-providers';
import { AI_PROVIDER_PROTOCOL_LABELS } from '@/types/ai-providers';

interface FormState {
  name: string;
  protocol: AIProviderProtocol;
  base_url: string;
  api_key: string;
  model: string;
  enable_thinking: boolean;
  max_tokens: string;
  max_tool_calls: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  protocol: 'anthropic',
  base_url: '',
  api_key: '',
  model: '',
  enable_thinking: false,
  max_tokens: '4096',
  max_tool_calls: '10',
};

const BASE_URL_HINTS: Record<AIProviderProtocol, string> = {
  anthropic:
    'Vacío = endpoint de Anthropic. Ej. Kimi K3: https://api.moonshot.ai/anthropic',
  openai:
    'DeepSeek: https://api.deepseek.com · Ollama: http://localhost:11434/v1 · LM Studio: http://localhost:1234/v1',
};

export function AiProviderSettings() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<AIProviderClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AIProviderClient | null>(
    null
  );

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-providers');
      if (!res.ok) throw new Error('No se pudieron cargar los proveedores');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (open) loadProviders();
  }, [open, loadProviders]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }, []);

  const startEdit = useCallback((p: AIProviderClient) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      protocol: p.protocol,
      base_url: p.base_url,
      api_key: '',
      model: p.model,
      enable_thinking: p.enable_thinking,
      max_tokens: String(p.max_tokens),
      max_tool_calls: String(p.max_tool_calls),
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.model.trim()) {
      toast({
        title: 'Campos requeridos',
        description: 'Nombre y modelo son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      protocol: form.protocol,
      base_url: form.base_url.trim(),
      api_key: form.api_key.trim(),
      model: form.model.trim(),
      enable_thinking: form.enable_thinking,
      max_tokens: Number(form.max_tokens) || 4096,
      max_tool_calls: Number(form.max_tool_calls) || 10,
    };

    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/ai-providers/${editingId}` : '/api/ai-providers',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'No se pudo guardar el proveedor');
      }
      toast({
        title: editingId ? 'Proveedor actualizado' : 'Proveedor creado',
        description: form.name.trim(),
      });
      resetForm();
      await loadProviders();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const activate = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-providers/${id}/activate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'No se pudo activar el proveedor');
      }
      toast({ title: 'Proveedor activado' });
      await loadProviders();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      });
    }
  };

  const remove = async (p: AIProviderClient) => {
    try {
      const res = await fetch(`/api/ai-providers/${p.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'No se pudo eliminar el proveedor');
      }
      toast({ title: 'Proveedor eliminado', description: p.name });
      if (editingId === p.id) resetForm();
      setDeleteTarget(null);
      await loadProviders();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      });
    }
  };

  const testConnection = async () => {
    if (!form.model.trim()) {
      toast({
        title: 'Modelo requerido',
        description: 'Indica el modelo antes de probar la conexión',
        variant: 'destructive',
      });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/ai-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: form.protocol,
          base_url: form.base_url.trim(),
          api_key: form.api_key.trim(),
          model: form.model.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        toast({ title: 'Conexión exitosa' });
      } else {
        toast({
          title: 'La conexión falló',
          description: data.error ?? 'Error desconocido',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const active = providers.find((p) => p.is_active);

  return (
    <>
      <div className="flex items-center gap-2">
        {active && (
          <span className="hidden text-xs text-muted-foreground md:inline">
            Activo: <span className="font-medium">{active.name}</span>
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          title="Configurar proveedores de IA"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Proveedores de IA</DialogTitle>
            <DialogDescription>
              Configura los proveedores de LLM. El proveedor activo se usa en el
              próximo mensaje del asistente, sin reiniciar la app.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando proveedores…
            </div>
          ) : (
            <div className="space-y-3">
              {providers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay proveedores configurados. Agrega uno abajo.
                </p>
              ) : (
                providers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <button
                      type="button"
                      onClick={() => activate(p.id)}
                      title="Activar"
                      className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                    >
                      {p.is_active ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{p.name}</span>
                        <Badge variant="secondary">
                          {AI_PROVIDER_PROTOCOL_LABELS[p.protocol]}
                        </Badge>
                        {p.is_active && <Badge variant="outline">Activo</Badge>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.model}
                        {p.has_api_key ? ` · key ${p.api_key_masked}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(p)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(p)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}

              <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {editingId ? 'Editar proveedor' : 'Añadir proveedor'}
                  </h3>
                  {editingId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetForm}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Nuevo
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="p-name">Nombre *</Label>
                    <Input
                      id="p-name"
                      placeholder="Ej. DeepSeek v4"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Protocolo</Label>
                    <Select
                      value={form.protocol}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          protocol: v as AIProviderProtocol,
                          ...(v === 'openai' ? { enable_thinking: false } : {}),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p-url">Base URL (opcional)</Label>
                  <Input
                    id="p-url"
                    placeholder="https://…"
                    value={form.base_url}
                    onChange={(e) =>
                      setForm({ ...form, base_url: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {BASE_URL_HINTS[form.protocol]}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p-key">API key</Label>
                  <Input
                    id="p-key"
                    type="password"
                    placeholder={
                      editingId
                        ? 'Dejar vacío para conservar la actual'
                        : 'Opcional para Ollama / LM Studio'
                    }
                    value={form.api_key}
                    onChange={(e) =>
                      setForm({ ...form, api_key: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p-model">Modelo *</Label>
                  <Input
                    id="p-model"
                    placeholder={
                      form.protocol === 'openai'
                        ? 'deepseek-chat, qwen2.5, …'
                        : 'claude-sonnet-4-6, kimi-k3, …'
                    }
                    value={form.model}
                    onChange={(e) =>
                      setForm({ ...form, model: e.target.value })
                    }
                  />
                </div>

                {form.protocol === 'anthropic' && (
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium">Extended thinking</p>
                      <p className="text-xs text-muted-foreground">
                        Solo con Anthropic directo (sin Base URL)
                      </p>
                    </div>
                    <Switch
                      checked={form.enable_thinking}
                      onCheckedChange={(v) =>
                        setForm({ ...form, enable_thinking: v })
                      }
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="p-maxtokens">Max tokens</Label>
                    <Input
                      id="p-maxtokens"
                      type="number"
                      min={1}
                      value={form.max_tokens}
                      onChange={(e) =>
                        setForm({ ...form, max_tokens: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-maxcalls">Max tool calls</Label>
                    <Input
                      id="p-maxcalls"
                      type="number"
                      min={1}
                      max={50}
                      value={form.max_tool_calls}
                      onChange={(e) =>
                        setForm({ ...form, max_tool_calls: e.target.value })
                      }
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    disabled={testing}
                  >
                    {testing && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Probar conexión
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setOpen(false)}
                    >
                      Cerrar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingId ? 'Guardar' : 'Crear'}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deleteTarget?.name}&quot;. Si era el activo,
              el asistente volverá a la configuración de .env (si existe).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && remove(deleteTarget)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
