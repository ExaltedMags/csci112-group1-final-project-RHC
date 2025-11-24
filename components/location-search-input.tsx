"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, X } from "lucide-react";

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
};

const FALLBACK_ICON = (
  <div className="shrink-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-50" />
);

export default function LocationSearchInput({
  label,
  icon = FALLBACK_ICON,
  value,
  onChange,
  placeholder,
  onFocus,
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
    <div className="relative space-y-2" ref={containerRef}>
      <Label
        htmlFor={inputId}
        className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase"
      >
        {label}
      </Label>
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-2.5 shadow-sm",
            "focus-within:border-slate-300 focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-slate-200",
            "transition-all duration-150 ease-out",
          )}
        >
          {icon}
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
            className="border-0 bg-transparent px-0 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoComplete="off"
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
          {!isLoading && showClear && (
            <button
              type="button"
              onClick={handleClear}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              aria-label="Clear location"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/20 backdrop-blur">
            {hasError ? (
              <div className="px-4 py-3 text-sm text-red-600">
                We couldn&apos;t load places. Please try again.
              </div>
            ) : showEmptyState ? (
              <div className="px-4 py-3 text-sm text-slate-500">
                No results found. Try a different place or building name.
              </div>
            ) : (
              <ul className="max-h-64 overflow-auto py-1">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-slate-50"
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {suggestion.label}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {suggestion.address}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
