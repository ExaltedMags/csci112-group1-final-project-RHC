"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
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
  iconRef?: RefObject<HTMLDivElement | null>;
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
  const [dropdownPosition, setDropdownPosition] = useState<{
    width: number;
    left: number;
    top: number;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputId = useId();

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.id, value?.label]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(target instanceof Element && target.closest('[data-dropdown-portal]'))
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

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

  const updateDropdownPosition = useCallback(() => {
    if (!fieldRef.current) {
      return;
    }
    const rect = fieldRef.current.getBoundingClientRect();
    const gap = 8; // match mt-2 spacing
    setDropdownPosition({
      width: rect.width,
      left: rect.left,
      top: rect.bottom + gap,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updateDropdownPosition();
    
    let rafId: number | null = null;
    const throttledUpdate = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        updateDropdownPosition();
        rafId = null;
      });
    };

    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", throttledUpdate, true);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", throttledUpdate, true);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [text, suggestions.length, isOpen, updateDropdownPosition]);

  const showClear = Boolean(text);
  const showEmptyState = !isLoading && !hasError && suggestions.length === 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const dropdownContent = (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
      {hasError ? (
        <div className="flex items-center gap-2 bg-red-50 px-4 py-4 text-sm text-red-600">
          <span>We couldn&apos;t load places. Please try again.</span>
        </div>
      ) : showEmptyState ? (
        <div className="flex items-center gap-2 bg-white px-4 py-4 text-sm text-warm-gray/60">
          <MapPin className="h-4 w-4" />
          <span>No results found. Try a different place or building name.</span>
        </div>
      ) : (
        <ul className="max-h-64 overflow-auto bg-white py-1">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id} className="bg-white">
              <button
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  "hover:bg-coral/5 focus:bg-coral/5 focus:outline-none"
                )}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="mt-0.5 shrink-0 rounded-lg bg-cream p-1.5">
                  <MapPin className="h-3.5 w-3.5 text-coral" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-warm-gray">
                    {suggestion.label}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-warm-gray/50">
                    {suggestion.address}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

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
          <div className="relative" ref={fieldRef}>
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

            {isClient &&
              isOpen &&
              dropdownPosition &&
              createPortal(
                <div
                  data-dropdown-portal
                  className="fixed z-[9999]"
                  style={{
                    width: dropdownPosition.width,
                    left: dropdownPosition.left,
                    top: dropdownPosition.top,
                  }}
                >
                  {dropdownContent}
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
