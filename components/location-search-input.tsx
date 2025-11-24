"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import type { PlaceSuggestion } from "@/lib/mapbox";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-50" />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
      return;
    }

    if (selectedLabel && trimmedText === selectedLabel) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (trimmedText.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ search: trimmedText });
        const response = await fetch(`/api/places/search?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch place suggestions");
        }

        const data: PlaceSuggestion[] = await response.json();
        setSuggestions(data);
        setIsOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("[location-search] Failed to fetch suggestions:", error);
        }
        setSuggestions([]);
        setIsOpen(false);
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
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
    if (value) {
      onChange(null);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border bg-slate-50 px-4 py-2",
            "focus-within:border-slate-300 focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-200"
          )}
        >
          {icon}
          <Input
            value={text}
            placeholder={placeholder}
            onChange={handleInputChange}
            onFocus={() => {
              setIsOpen(suggestions.length > 0);
              onFocus?.();
            }}
            className="border-0 bg-transparent px-0 text-base font-medium focus-visible:ring-0"
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border bg-white shadow-lg">
            {suggestions.length === 0 && !isLoading ? (
              <div className="px-4 py-3 text-sm text-slate-500">
                No results found
              </div>
            ) : (
              <ul className="max-h-64 overflow-auto py-2">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left hover:bg-slate-100"
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {suggestion.label}
                      </p>
                      <p className="text-xs text-slate-500">
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


