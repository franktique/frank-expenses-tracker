'use client';

import { useState, useRef } from 'react';
import { Check, ChevronsUpDown, Loader2, Tag, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Event } from '@/types/funds';

interface EventSelectorProps {
  selectedEvent: Event | null;
  onEventChange: (event: Event | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function EventSelector({
  selectedEvent,
  onEventChange,
  placeholder = 'Seleccionar evento...',
  className,
  disabled = false,
}: EventSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEvents = async (query: string) => {
    setIsLoading(true);
    try {
      const url = query.trim()
        ? `/api/events?search=${encodeURIComponent(query.trim())}&limit=20`
        : '/api/events?limit=20';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.events ?? []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSearchValue('');
      fetchEvents('');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEvents(value), 300);
  };

  const handleSelect = (eventId: number | null) => {
    if (eventId === null) {
      onEventChange(null);
    } else {
      const found = events.find((e) => e.id === eventId);
      onEventChange(found ?? null);
    }
    setOpen(false);
    setSearchValue('');
  };

  const handleCreate = async () => {
    const name = searchValue.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const data = await response.json();
        // If duplicate, try to find the existing event and select it
        if (data.error === 'DUPLICATE_EVENT') {
          const searchResponse = await fetch(
            `/api/events?search=${encodeURIComponent(name)}&limit=20`
          );
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const existing = (searchData.events ?? []).find(
              (e: Event) => e.name.toLowerCase() === name.toLowerCase()
            );
            if (existing) {
              onEventChange(existing);
              setOpen(false);
              setSearchValue('');
              return;
            }
          }
        }
        throw new Error(data.message ?? 'Failed to create event');
      }
      const newEvent: Event = await response.json();
      setEvents((prev) => [newEvent, ...prev]);
      onEventChange(newEvent);
      setOpen(false);
      setSearchValue('');
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Check if typed value exactly matches any result (case-insensitive)
  const exactMatch = events.some(
    (e) => e.name.toLowerCase() === searchValue.trim().toLowerCase()
  );
  const showCreateOption = searchValue.trim().length > 0 && !exactMatch;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          <Tag className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedEvent ? selectedEvent.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar evento..."
            value={searchValue}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && (
              <>
                <CommandEmpty>
                  {searchValue.trim()
                    ? 'No se encontraron eventos.'
                    : 'No hay eventos registrados.'}
                </CommandEmpty>
                <CommandGroup>
                  {/* No event option */}
                  <CommandItem
                    key="no-event"
                    value="no-event"
                    onSelect={() => handleSelect(null)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedEvent === null ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="text-muted-foreground">Sin evento</span>
                  </CommandItem>

                  {/* Event options */}
                  {events.map((event) => (
                    <CommandItem
                      key={event.id}
                      value={String(event.id)}
                      onSelect={() => handleSelect(event.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedEvent?.id === event.id
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <span>{event.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>

                {/* Create option */}
                {showCreateOption && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        value={`create-${searchValue}`}
                        onSelect={handleCreate}
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PlusCircle className="mr-2 h-4 w-4" />
                        )}
                        <span>
                          Crear evento:{' '}
                          <strong>&ldquo;{searchValue.trim()}&rdquo;</strong>
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
