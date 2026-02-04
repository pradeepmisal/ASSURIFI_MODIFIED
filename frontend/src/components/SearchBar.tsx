// ASSUREFI/frontend/src/components/SearchBar.tsx

import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config";

interface SearchBarProps {
  onCoinSelect?: (address: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onCoinSelect }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for debounce timeout

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) { // Changed to 2 characters to reduce initial empty searches
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        // Call your new backend endpoint instead of CoinGecko directly
        const response = await fetch(`${API_BASE_URL}/search?name=${query}`);
        const data = await response.json();

        if (response.ok) {
          setSuggestions(data); // `data` is already processed by your backend
        } else {
          console.error("Backend search API error:", data.error);
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching suggestions from backend:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the API call
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchSuggestions();
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    // If there's a query and first suggestion has address, select it
    if (query && suggestions.length > 0 && onCoinSelect && suggestions[0].contract_address) {
      onCoinSelect(suggestions[0].contract_address);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setQuery(suggestion.name); // Keep coin name in the search bar itself
    setShowSuggestions(false);
    if (onCoinSelect && suggestion.contract_address) {
      onCoinSelect(suggestion.contract_address); // Pass the contract address
    } else if (onCoinSelect) {
      // Fallback if somehow no contract_address, though backend should filter this
      console.warn("No contract address found for selected suggestion:", suggestion);
      onCoinSelect(suggestion.id || suggestion.symbol || "");
    }
  };

  // ... existing useEffect for handleClickOutside ...

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 lg:px-8">
      <form
        onSubmit={handleSearch}
        className="max-w-3xl mx-auto flex items-center gap-2 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search for cryptocurrencies (e.g., Solana, BTC, ETH)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full pl-10"
          />

          {/* Suggestions dropdown */}
          {showSuggestions && (query.length > 0) && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-md shadow-lg max-h-64 overflow-auto border border-slate-200 dark:border-slate-700">
              {loading ? (
                <div className="p-2 text-center text-slate-500">Loading...</div>
              ) : suggestions.length > 0 ? (
                <ul>
                  {suggestions.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      onClick={() => handleSuggestionClick(item)}
                    >
                      {item.thumb && (
                        <img src={item.thumb} alt={item.name} className="w-6 h-6 rounded-full" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.symbol.toUpperCase()}</div>
                        {item.contract_address && (
                          <div className="text-xs text-blue-400 truncate mt-1 font-mono">{item.contract_address}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-2 text-center text-slate-500">No results found</div>
              )}
            </div>
          )}
        </div>
        <Button type="submit">Search</Button>
      </form>
    </div>
  );
};

export default SearchBar;
