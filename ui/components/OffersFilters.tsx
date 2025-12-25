'use client';

import { useState, useEffect, useRef } from 'react';

export interface OffersFilters {
    ships?: string[];
    startDate?: string;
    endDate?: string;
    ports?: string[];
    minDays?: number;
}

interface OffersFiltersProps {
    onFilterChange: (filters: OffersFilters) => void;
    filters: OffersFilters;
    availableShips: string[];
    availablePorts: string[];
}

export default function OffersFilters({ onFilterChange, filters, availableShips, availablePorts }: OffersFiltersProps) {
    const [selectedShips, setSelectedShips] = useState<Set<string>>(new Set(filters.ships || []));
    const [portsInput, setPortsInput] = useState(filters.ports?.join(', ') || '');
    const [startDate, setStartDate] = useState(filters.startDate || '');
    const [endDate, setEndDate] = useState(filters.endDate || '');
    const [minDays, setMinDays] = useState(filters.minDays?.toString() || '');
    const [showShipDropdown, setShowShipDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowShipDropdown(false);
            }
        };

        if (showShipDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showShipDropdown]);

    // Update selected ships when filters change
    useEffect(() => {
        if (filters.ships) {
            setSelectedShips(new Set(filters.ships));
        } else {
            setSelectedShips(new Set());
        }
    }, [filters.ships]);

    const toggleShip = (ship: string) => {
        const newSelected = new Set(selectedShips);
        if (newSelected.has(ship)) {
            newSelected.delete(ship);
        } else {
            newSelected.add(ship);
        }
        setSelectedShips(newSelected);
    };

    const handleApplyFilters = () => {
        const newFilters: OffersFilters = {};

        if (selectedShips.size > 0) {
            newFilters.ships = Array.from(selectedShips);
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

        onFilterChange(newFilters);
    };

    const handleClearFilters = () => {
        setSelectedShips(new Set());
        setPortsInput('');
        setStartDate('');
        setEndDate('');
        setMinDays('');
        onFilterChange({});
    };

    const sortedShips = [...availableShips].sort();

    return (
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-black">Filters</h3>
            <div className="space-y-4">
                {/* Ships Multi-Select */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ships ({selectedShips.size} selected)
                    </label>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setShowShipDropdown(!showShipDropdown)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {selectedShips.size === 0 ? (
                                <span className="text-gray-500">Select ships...</span>
                            ) : (
                                <span className="text-gray-700">
                                    {selectedShips.size} ship{selectedShips.size !== 1 ? 's' : ''} selected
                                </span>
                            )}
                            <span className="absolute right-2 top-2.5">
                                <svg
                                    className={`w-5 h-5 text-gray-400 transition-transform ${showShipDropdown ? 'transform rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </span>
                        </button>
                        {showShipDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                <div className="p-2">
                                    {sortedShips.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-gray-500">No ships available</div>
                                    ) : (
                                        sortedShips.map((ship) => (
                                            <label
                                                key={ship}
                                                className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedShips.has(ship)}
                                                    onChange={() => toggleShip(ship)}
                                                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{ship}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {selectedShips.size > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {Array.from(selectedShips).map((ship) => (
                                <span
                                    key={ship}
                                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                >
                                    {ship}
                                    <button
                                        onClick={() => toggleShip(ship)}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ports Input */}
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
                    {availablePorts.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                            Available ports: {availablePorts.slice(0, 10).join(', ')}
                            {availablePorts.length > 10 && ` and ${availablePorts.length - 10} more`}
                        </p>
                    )}
                </div>

                {/* Date Range */}
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

                {/* Minimum Days */}
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

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleApplyFilters}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                        Apply Filters
                    </button>
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

