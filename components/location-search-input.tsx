"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Loader2, X, MapPin } from "lucide-react";

import type { PlaceSuggestion } from "@/lib/mapbox";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_DELAY = 300;

type LocationSearchInputProps = {
  label: string;
  icon?: ReactNode;
  value: PlaceSuggestion | null;
  onChange: (place: PlaceSuggestion | null) => void;
  placeholder?: string;
  onFocus?: () => void;
  iconRef?: RefObject<HTMLDivElement>;
};

const FALLBACK_ICON = (
  <div className="shrink-0 w-4 h-4 rounded-full bg-coral ring-4 ring-coral/20" />
);

export default function LocationSearchInput({
  label,
  icon = FALLBACK_ICON,
  value,
  onChange,
  placeholder,
  onFocus,
  iconRef,
}: LocationSearchInputProps) {
  const [text, setText] = useState(value?.label ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputId = useId();

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.id, value?.label]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmedText = text.trim();
    const selectedLabel = value?.label?.trim() ?? "";

    if (!trimmedText) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    if (selectedLabel && trimmedText === selectedLabel) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    if (trimmedText.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const params = new URLSearchParams({ search: trimmedText });
        const response = await fetch(`/api/places/search?${params.toString()}`);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch place suggestions: ${response.status} ${errorText}`);
        }

        const data: PlaceSuggestion[] = await response.json();
        
        if (!Array.isArray(data)) {
          console.error("[location-search] Invalid response format:", data);
          setSuggestions([]);
          setIsOpen(true);
          setHasError(false);
        } else {
          setSuggestions(data);
          // Always open dropdown if we have a query, even if no results
          setIsOpen(true);
          setHasError(false);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("[location-search] Failed to fetch suggestions:", error);
        }
        setSuggestions([]);
        setIsOpen(true); // Show error message in dropdown
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [text, value?.label]);

  const handleSuggestionSelect = (suggestion: PlaceSuggestion) => {
    onChange(suggestion);
    setText(suggestion.label);
    setSuggestions([]);
    setIsOpen(false);
    setHasError(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
    if (value) {
      onChange(null);
    }
  };

  const handleClear = () => {
    setText("");
    setSuggestions([]);
    setIsOpen(false);
    setHasError(false);
    if (value) {
      onChange(null);
    }
    inputRef.current?.focus();
  };

  const showClear = Boolean(text);
  const showEmptyState = !isLoading && !hasError && suggestions.length === 0;

  return (
    <div className="relative" ref={containerRef}>
      {/* Row layout: icon column + content column */}
      <div className="flex gap-3">
        {/* Icon column - stays visible for connector line alignment */}
        <div className="flex flex-col items-center pt-6">
          <div className="shrink-0" ref={iconRef}>
            {icon}
          </div>
        </div>
        
        {/* Content column - label + input */}
        <div className="flex-1 space-y-1.5">
          <Label
            htmlFor={inputId}
            className="text-[11px] font-bold tracking-[0.12em] text-warm-gray/50 uppercase"
          >
            {label}
          </Label>
          <div className="relative">
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-3",
                "focus-within:border-coral/50 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-coral/5 focus-within:ring-2 focus-within:ring-coral/20",
                "transition-all duration-200 ease-out",
              )}
            >
              <Input
                id={inputId}
                ref={inputRef}
                value={text}
                placeholder={placeholder}
                onChange={handleInputChange}
                onFocus={() => {
                  setIsOpen(suggestions.length > 0);
                  onFocus?.();
                }}
                className="border-0 bg-transparent px-0 text-[15px] font-semibold text-warm-gray placeholder:text-warm-gray/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                autoComplete="off"
              />
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-coral" />
              )}
              {!isLoading && showClear && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-cream text-warm-gray/60 hover:bg-coral/10 hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral transition-colors"
                  aria-label="Clear location"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {isOpen && (
              <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-xl shadow-warm-gray/10 animate-scale-in">
                {hasError ? (
                  <div className="px-4 py-4 text-sm text-red-600 bg-red-50 flex items-center gap-2">
                    <span>We couldn&apos;t load places. Please try again.</span>
                  </div>
                ) : showEmptyState ? (
                  <div className="px-4 py-4 text-sm text-warm-gray/60 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>No results found. Try a different place or building name.</span>
                  </div>
                ) : (
                  <ul className="max-h-64 overflow-auto py-1">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.id}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                            "hover:bg-coral/5 focus:bg-coral/5 focus:outline-none"
                          )}
                          onClick={() => handleSuggestionSelect(suggestion)}
                        >
                          <div className="p-1.5 rounded-lg bg-cream mt-0.5 shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-coral" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-warm-gray truncate">
                              {suggestion.label}
                            </p>
                            <p className="text-xs text-warm-gray/50 line-clamp-1 mt-0.5">
                              {suggestion.address}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
