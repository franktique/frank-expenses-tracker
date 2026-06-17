'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import type { Category, CategorySubgroup, CategoryItem } from '@/types/funds';

interface CategorySubcatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
}

export function CategorySubcatalogDialog({
  open,
  onOpenChange,
  category,
}: CategorySubcatalogDialogProps) {
  const { toast } = useToast();
  const [subgroups, setSubgroups] = useState<CategorySubgroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set());

  // Subgroup add/edit state
  const [addingSubgroup, setAddingSubgroup] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [editingSubgroupId, setEditingSubgroupId] = useState<string | null>(null);
  const [editingSubgroupName, setEditingSubgroupName] = useState('');

  // Item add/edit state
  const [addingItemForSubgroupId, setAddingItemForSubgroupId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [editingItemUnit, setEditingItemUnit] = useState('');

  const fetchSubgroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories/${category.id}/subgroups`);
      if (!res.ok) throw new Error('Error al cargar sub-grupos');
      const data = await res.json();
      setSubgroups(data);
      // Auto-expand all subgroups
      setExpandedSubgroups(new Set(data.map((sg: CategorySubgroup) => sg.id)));
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [category.id, toast]);

  useEffect(() => {
    if (open) {
      fetchSubgroups();
    }
  }, [open, fetchSubgroups]);

  const toggleExpand = (id: string) => {
    setExpandedSubgroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // --- Subgroup CRUD ---

  const handleAddSubgroup = async () => {
    if (!newSubgroupName.trim()) return;
    try {
      const res = await fetch(`/api/categories/${category.id}/subgroups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubgroupName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear sub-grupo');
      }
      setNewSubgroupName('');
      setAddingSubgroup(false);
      await fetchSubgroups();
      toast({ title: 'Sub-grupo creado' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleUpdateSubgroup = async (subgroupId: string) => {
    if (!editingSubgroupName.trim()) return;
    try {
      const res = await fetch(
        `/api/categories/${category.id}/subgroups/${subgroupId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editingSubgroupName.trim() }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar sub-grupo');
      }
      setEditingSubgroupId(null);
      await fetchSubgroups();
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDeleteSubgroup = async (subgroupId: string) => {
    try {
      const res = await fetch(
        `/api/categories/${category.id}/subgroups/${subgroupId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar sub-grupo');
      }
      await fetchSubgroups();
      toast({ title: 'Sub-grupo eliminado' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  // --- Item CRUD ---

  const handleAddItem = async (subgroupId: string) => {
    if (!newItemName.trim()) return;
    try {
      const res = await fetch(
        `/api/categories/${category.id}/subgroups/${subgroupId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newItemName.trim(),
            default_unit: newItemUnit.trim() || undefined,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear ítem');
      }
      setAddingItemForSubgroupId(null);
      setNewItemName('');
      setNewItemUnit('');
      await fetchSubgroups();
      toast({ title: 'Ítem creado' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleUpdateItem = async (subgroupId: string, itemId: string) => {
    if (!editingItemName.trim()) return;
    try {
      const res = await fetch(
        `/api/categories/${category.id}/subgroups/${subgroupId}/items/${itemId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingItemName.trim(),
            default_unit: editingItemUnit.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar ítem');
      }
      setEditingItemId(null);
      await fetchSubgroups();
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (subgroupId: string, itemId: string) => {
    try {
      const res = await fetch(
        `/api/categories/${category.id}/subgroups/${subgroupId}/items/${itemId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar ítem');
      }
      await fetchSubgroups();
      toast({ title: 'Ítem eliminado' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sub-categorías: {category.name}</DialogTitle>
          <DialogDescription>
            Gestiona los sub-grupos e ítems del catálogo para esta categoría.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando...</div>
        ) : (
          <div className="space-y-3">
            {subgroups.map((sg) => (
              <div key={sg.id} className="border rounded-lg overflow-hidden">
                {/* Sub-group header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
                  <button
                    onClick={() => toggleExpand(sg.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {expandedSubgroups.has(sg.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {editingSubgroupId === sg.id ? (
                    <>
                      <Input
                        value={editingSubgroupName}
                        onChange={(e) => setEditingSubgroupName(e.target.value)}
                        className="h-7 text-sm flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateSubgroup(sg.id);
                          if (e.key === 'Escape') setEditingSubgroupId(null);
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleUpdateSubgroup(sg.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditingSubgroupId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-sm flex-1">{sg.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {sg.items?.length ?? 0} ítems
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingSubgroupId(sg.id);
                          setEditingSubgroupName(sg.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteSubgroup(sg.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Items list */}
                {expandedSubgroups.has(sg.id) && (
                  <div className="divide-y">
                    {(sg.items ?? []).map((item: CategoryItem) => (
                      <div key={item.id} className="flex items-center gap-2 px-4 py-1.5 group">
                        {editingItemId === item.id ? (
                          <>
                            <Input
                              value={editingItemName}
                              onChange={(e) => setEditingItemName(e.target.value)}
                              placeholder="Nombre"
                              className="h-7 text-sm flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateItem(sg.id, item.id);
                                if (e.key === 'Escape') setEditingItemId(null);
                              }}
                              autoFocus
                            />
                            <Input
                              value={editingItemUnit}
                              onChange={(e) => setEditingItemUnit(e.target.value)}
                              placeholder="Unidad (opcional)"
                              className="h-7 text-sm w-28"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleUpdateItem(sg.id, item.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingItemId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm flex-1">{item.name}</span>
                            {item.default_unit && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {item.default_unit}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditingItemName(item.name);
                                setEditingItemUnit(item.default_unit ?? '');
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                              onClick={() => handleDeleteItem(sg.id, item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add item inline */}
                    {addingItemForSubgroupId === sg.id ? (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/20">
                        <Input
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Nombre del ítem"
                          className="h-7 text-sm flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddItem(sg.id);
                            if (e.key === 'Escape') {
                              setAddingItemForSubgroupId(null);
                              setNewItemName('');
                              setNewItemUnit('');
                            }
                          }}
                          autoFocus
                        />
                        <Input
                          value={newItemUnit}
                          onChange={(e) => setNewItemUnit(e.target.value)}
                          placeholder="Unidad (ej: kg, L)"
                          className="h-7 text-sm w-32"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddItem(sg.id);
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleAddItem(sg.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setAddingItemForSubgroupId(null);
                            setNewItemName('');
                            setNewItemUnit('');
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="px-4 py-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => {
                            setAddingItemForSubgroupId(sg.id);
                            setNewItemName('');
                            setNewItemUnit('');
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar ítem
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add sub-group */}
            {addingSubgroup ? (
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20">
                <Input
                  value={newSubgroupName}
                  onChange={(e) => setNewSubgroupName(e.target.value)}
                  placeholder="Nombre del sub-grupo"
                  className="h-8 text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubgroup();
                    if (e.key === 'Escape') {
                      setAddingSubgroup(false);
                      setNewSubgroupName('');
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleAddSubgroup}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setAddingSubgroup(false);
                    setNewSubgroupName('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setAddingSubgroup(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar sub-grupo
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
