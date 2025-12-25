'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

export interface Filters {
    ships?: string[];
    startDate?: string;
    endDate?: string;
    ports?: string[];
    minDays?: number;
    offerCodePrefix?: string;
}

interface ComparisonFiltersProps {
    onFilterChange: (filters: Filters) => void;
    filters: Filters;
    commonOfferCodes?: any[];
    user1OnlyCodes?: any[];
    user2OnlyCodes?: any[];
}

export default function ComparisonFilters({ onFilterChange, filters, commonOfferCodes = [], user1OnlyCodes = [], user2OnlyCodes = [] }: ComparisonFiltersProps) {
    const [shipsInput, setShipsInput] = useState(filters.ships?.join(', ') || '');
    const [portsInput, setPortsInput] = useState(filters.ports?.join(', ') || '');
    const [startDate, setStartDate] = useState(filters.startDate || '');
    const [endDate, setEndDate] = useState(filters.endDate || '');
    const [minDays, setMinDays] = useState(filters.minDays?.toString() || '');
    const [offerCodePrefix, setOfferCodePrefix] = useState(filters.offerCodePrefix || '');
    const prevFiltersRef = useRef(filters);

    // Sync local state with filters prop when it changes externally (e.g., when cleared)
    useEffect(() => {
        // Only sync if filters prop actually changed (not from our own updates)
        const filtersChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
        if (filtersChanged) {
            setShipsInput(filters.ships?.join(', ') || '');
            setPortsInput(filters.ports?.join(', ') || '');
            setStartDate(filters.startDate || '');
            setEndDate(filters.endDate || '');
            setMinDays(filters.minDays?.toString() || '');
            setOfferCodePrefix(filters.offerCodePrefix || '');
            prevFiltersRef.current = filters;
        }
    }, [filters]);

    useEffect(() => {
        const newFilters: Filters = {};

        if (shipsInput.trim()) {
            newFilters.ships = shipsInput.split(',').map(s => s.trim()).filter(Boolean);
        }

        if (portsInput.trim()) {
            newFilters.ports = portsInput.split(',').map(p => p.trim()).filter(Boolean);
        }

        if (startDate) {
            newFilters.startDate = startDate;
        }

        if (endDate) {
            newFilters.endDate = endDate;
        }

        if (minDays) {
            const days = parseInt(minDays, 10);
            if (!isNaN(days) && days > 0) {
                newFilters.minDays = days;
            }
        }

        if (offerCodePrefix.trim()) {
            newFilters.offerCodePrefix = offerCodePrefix.trim().toUpperCase();
        }

        onFilterChange(newFilters);
    }, [shipsInput, portsInput, startDate, endDate, minDays, offerCodePrefix, onFilterChange]);

    const handleClearFilters = () => {
        setShipsInput('');
        setPortsInput('');
        setStartDate('');
        setEndDate('');
        setMinDays('');
        setOfferCodePrefix('');
        onFilterChange({});
    };

    // Extract unique offer code prefixes with descriptions and group them
    const offerCodePrefixes = useMemo(() => {
        const getPrefix = (code: string) => {
            if (!code || code.length < 5) return null;
            return code.slice(0, 5).toUpperCase();
        };

        interface PrefixInfo {
            prefix: string;
            description: string;
        }

        const commonPrefixesMap = new Map<string, string>(); // prefix -> description
        const user1OnlyPrefixesMap = new Map<string, string>();
        const user2OnlyPrefixesMap = new Map<string, string>();

        // Process common offer codes
        commonOfferCodes.forEach((offer: any) => {
            const code = typeof offer === 'string' ? offer : offer.code;
            const description = typeof offer === 'string' ? '' : (offer.description || '');
            const prefix = getPrefix(code);
            if (prefix) {
                // Use the first description we encounter for this prefix, or keep existing if already set
                if (!commonPrefixesMap.has(prefix) || !commonPrefixesMap.get(prefix)) {
                    commonPrefixesMap.set(prefix, description);
                }
            }
        });

        // Process user1 only codes
        user1OnlyCodes.forEach((offer: any) => {
            const code = typeof offer === 'string' ? offer : offer.code;
            const description = typeof offer === 'string' ? '' : (offer.description || '');
            const prefix = getPrefix(code);
            if (prefix && !commonPrefixesMap.has(prefix)) {
                if (!user1OnlyPrefixesMap.has(prefix) || !user1OnlyPrefixesMap.get(prefix)) {
                    user1OnlyPrefixesMap.set(prefix, description);
                }
            }
        });

        // Process user2 only codes
        user2OnlyCodes.forEach((offer: any) => {
            const code = typeof offer === 'string' ? offer : offer.code;
            const description = typeof offer === 'string' ? '' : (offer.description || '');
            const prefix = getPrefix(code);
            if (prefix && !commonPrefixesMap.has(prefix)) {
                if (!user2OnlyPrefixesMap.has(prefix) || !user2OnlyPrefixesMap.get(prefix)) {
                    user2OnlyPrefixesMap.set(prefix, description);
                }
            }
        });

        // Convert maps to sorted arrays
        const mapToArray = (map: Map<string, string>): PrefixInfo[] => {
            return Array.from(map.entries())
                .map(([prefix, description]) => ({ prefix, description }))
                .sort((a, b) => a.prefix.localeCompare(b.prefix));
        };

        return {
            common: mapToArray(commonPrefixesMap),
            user1Only: mapToArray(user1OnlyPrefixesMap),
            user2Only: mapToArray(user2OnlyPrefixesMap),
        };
    }, [commonOfferCodes, user1OnlyCodes, user2OnlyCodes]);

    return (
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-black">Filters</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ships (comma-separated)
                    </label>
                    <input
                        type="text"
                        value={shipsInput}
                        onChange={(e) => setShipsInput(e.target.value)}
                        placeholder="e.g., Serenade, Enchantment"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ports (comma-separated)
                    </label>
                    <input
                        type="text"
                        value={portsInput}
                        onChange={(e) => setPortsInput(e.target.value)}
                        placeholder="e.g., Miami, Fort Lauderdale"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Days
                    </label>
                    <input
                        type="number"
                        value={minDays}
                        onChange={(e) => setMinDays(e.target.value)}
                        placeholder="e.g., 5"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Offer Code Prefix (first 5 characters)
                    </label>
                    <select
                        value={offerCodePrefix}
                        onChange={(e) => setOfferCodePrefix(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                        <option value="">All Offers</option>
                        {offerCodePrefixes.common.length > 0 && (
                            <optgroup label={`Common Offers (${offerCodePrefixes.common.length})`}>
                                {offerCodePrefixes.common.map((item) => (
                                    <option key={item.prefix} value={item.prefix}>
                                        {item.prefix}{item.description ? ` - ${item.description}` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {offerCodePrefixes.user1Only.length > 0 && (
                            <optgroup label={`User 1 Only (${offerCodePrefixes.user1Only.length})`}>
                                {offerCodePrefixes.user1Only.map((item) => (
                                    <option key={item.prefix} value={item.prefix}>
                                        {item.prefix}{item.description ? ` - ${item.description}` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {offerCodePrefixes.user2Only.length > 0 && (
                            <optgroup label={`User 2 Only (${offerCodePrefixes.user2Only.length})`}>
                                {offerCodePrefixes.user2Only.map((item) => (
                                    <option key={item.prefix} value={item.prefix}>
                                        {item.prefix}{item.description ? ` - ${item.description}` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Filter by offer code prefix (first 5 characters)</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleClearFilters}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}

