'use client';

import { useState, useMemo } from 'react';
import { Filters, filterSailings } from '@/lib/comparison';
import ComparisonFilters from './ComparisonFilters';

interface UserComparisonResultsProps {
    results: any;
    loading?: boolean;
}

export default function UserComparisonResults({ results, loading }: UserComparisonResultsProps) {
    const [filters, setFilters] = useState<Filters>({});
    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Comparing users...</p>
            </div>
        );
    }

    if (!results) {
        return null;
    }

    const { stats, commonOfferCodes, user1OnlyCodes, user2OnlyCodes, matchingSailings: allMatchingSailings, user1OnlySailings, user2OnlySailings } = results;

    // Filter matching sailings based on active filters
    const matchingSailings = useMemo(() => {
        if (!allMatchingSailings || allMatchingSailings.length === 0) {
            return [];
        }
        if (!filters || Object.keys(filters).length === 0) {
            return allMatchingSailings;
        }

        // First, filter by offer code prefix if specified (check all offer codes in the sailing)
        let filteredByPrefix = allMatchingSailings;
        if (filters.offerCodePrefix && filters.offerCodePrefix.trim()) {
            const prefix = filters.offerCodePrefix.trim().toUpperCase();
            filteredByPrefix = allMatchingSailings.filter((sailing: any) => {
                // Check if any user1 or user2 offer code matches the prefix
                const user1Match = sailing.user1Offers?.some((code: string) =>
                    code && code.length >= 5 && code.slice(0, 5).toUpperCase() === prefix
                );
                const user2Match = sailing.user2Offers?.some((code: string) =>
                    code && code.length >= 5 && code.slice(0, 5).toUpperCase() === prefix
                );
                return user1Match || user2Match;
            });
        }

        // Convert matchingSailings format to Sailing format for other filtering
        const sailingsForFiltering = filteredByPrefix.map((sailing: any) => ({
            shipName: sailing.shipName,
            sailDate: sailing.sailDate,
            departurePort: sailing.departurePort,
            itinerary: sailing.itinerary || '',
            nights: sailing.nights || 0,
            offerCode: '', // Not needed for filtering
            offerName: '', // Not needed for filtering
        }));

        // Create a filter without offerCodePrefix since we already handled it
        const filtersWithoutPrefix = { ...filters };
        delete filtersWithoutPrefix.offerCodePrefix;

        const filtered = filterSailings(sailingsForFiltering, filtersWithoutPrefix);
        // Map back to original format using sailDate and shipName as keys
        const filteredKeys = new Set(filtered.map(s => `${s.shipName}|${s.sailDate}`.toLowerCase()));
        return filteredByPrefix.filter((sailing: any) =>
            filteredKeys.has(`${sailing.shipName}|${sailing.sailDate}`.toLowerCase())
        );
    }, [allMatchingSailings, filters]);

    return (
        <div className="space-y-6">
            <ComparisonFilters
                onFilterChange={setFilters}
                filters={filters}
                commonOfferCodes={commonOfferCodes}
                user1OnlyCodes={user1OnlyCodes}
                user2OnlyCodes={user2OnlyCodes}
            />
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-black">Comparison Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">User 1 Total Offers</p>
                        <p className="text-2xl font-semibold">{stats.totalUser1Offers}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">User 2 Total Offers</p>
                        <p className="text-2xl font-semibold">{stats.totalUser2Offers}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Common Offers</p>
                        <p className="text-2xl font-semibold text-green-600">{stats.commonOffers}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">User 1 Only</p>
                        <p className="text-2xl font-semibold text-blue-600">{stats.user1Only}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">User 2 Only</p>
                        <p className="text-2xl font-semibold text-purple-600">{stats.user2Only}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Matching Sailings</p>
                        <p className="text-2xl font-semibold text-orange-600">{stats.matchingSailings}</p>
                    </div>
                </div>
            </div>

            {commonOfferCodes.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-xl font-semibold mb-4 text-black">Common Offer Codes ({commonOfferCodes.length})</h3>
                    <div className="space-y-3">
                        {commonOfferCodes.map((offer: any, idx: number) => {
                            const code = typeof offer === 'string' ? offer : offer.code;
                            const name = typeof offer === 'string' ? '' : offer.name;
                            const description = typeof offer === 'string' ? '' : offer.description;
                            return (
                                <div key={idx} className="border border-green-200 rounded-lg p-3 bg-green-50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                            {code}
                                        </span>
                                        {name && (
                                            <span className="text-sm font-medium text-black">{name}</span>
                                        )}
                                    </div>
                                    {description && (
                                        <p className="text-sm text-gray-600 mt-1 ml-1">{description}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {user1OnlyCodes.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-xl font-semibold mb-4 text-black">User 1 Only Offers ({user1OnlyCodes.length})</h3>
                    <div className="space-y-3">
                        {user1OnlyCodes.map((offer: any, idx: number) => {
                            const code = typeof offer === 'string' ? offer : offer.code;
                            const name = typeof offer === 'string' ? '' : offer.name;
                            const description = typeof offer === 'string' ? '' : offer.description;
                            return (
                                <div key={idx} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                            {code}
                                        </span>
                                        {name && (
                                            <span className="text-sm font-medium text-black">{name}</span>
                                        )}
                                    </div>
                                    {description && (
                                        <p className="text-sm text-gray-600 mt-1 ml-1">{description}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {user2OnlyCodes.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-xl font-semibold mb-4 text-black">User 2 Only Offers ({user2OnlyCodes.length})</h3>
                    <div className="space-y-3">
                        {user2OnlyCodes.map((offer: any, idx: number) => {
                            const code = typeof offer === 'string' ? offer : offer.code;
                            const name = typeof offer === 'string' ? '' : offer.name;
                            const description = typeof offer === 'string' ? '' : offer.description;
                            return (
                                <div key={idx} className="border border-purple-200 rounded-lg p-3 bg-purple-50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                                            {code}
                                        </span>
                                        {name && (
                                            <span className="text-sm font-medium text-black">{name}</span>
                                        )}
                                    </div>
                                    {description && (
                                        <p className="text-sm text-gray-600 mt-1 ml-1">{description}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {matchingSailings.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-xl font-semibold mb-4 text-black">Matching Sailings ({matchingSailings.length})</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Ship</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Sail Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Port</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">User 1 Offers</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">User 2 Offers</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {matchingSailings.sort((a: any, b: any) => a.sailDate > b.sailDate ? 1 : -1).map((sailing: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td valign="top" className="px-4 py-3 whitespace-nowrap text-black text-sm font-medium">{sailing.shipName}</td>
                                        <td valign="top" className="px-4 py-3 whitespace-nowrap text-black text-sm">{sailing.sailDate}</td>
                                        <td valign="top" className="px-4 py-3 whitespace-nowrap text-black text-sm">{sailing.departurePort}</td>
                                        <td valign="top" className="px-4 py-3 text-sm">
                                            <div className="space-y-2">
                                                {sailing.user1Offers.map((code: string, i: number) => {
                                                    const offerName = sailing.user1OfferNames?.[i] || '';
                                                    const offerDescription = sailing.user1OfferDescriptions?.[i] || '';
                                                    return (
                                                        <div key={i} className="bg-blue-50 border border-blue-200 rounded p-2">
                                                            <div className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block mb-1">
                                                                {code}
                                                            </div>
                                                            {offerName && (
                                                                <p className="text-xs font-medium text-gray-800 mt-1">{offerName}</p>
                                                            )}
                                                            {offerDescription && (
                                                                <p className="text-xs text-gray-600 mt-1 italic">{offerDescription}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td valign="top" className="px-4 py-3 text-sm">
                                            <div className="space-y-2">
                                                {sailing.user2Offers.map((code: string, i: number) => {
                                                    const offerName = sailing.user2OfferNames?.[i] || '';
                                                    const offerDescription = sailing.user2OfferDescriptions?.[i] || '';
                                                    return (
                                                        <div key={i} className="bg-purple-50 border border-purple-200 rounded p-2">
                                                            <div className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-1 rounded inline-block mb-1">
                                                                {code}
                                                            </div>
                                                            {offerName && (
                                                                <p className="text-xs font-medium text-gray-800 mt-1">{offerName}</p>
                                                            )}
                                                            {offerDescription && (
                                                                <p className="text-xs text-gray-600 mt-1 italic">{offerDescription}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* {matchingSailings.length > 50 && (
                            <p className="mt-4 text-sm text-gray-600">
                                Showing first 50 of {matchingSailings.length} matching sailings
                            </p>
                        )} */}
                    </div>
                </div>
            )}
        </div>
    );
}

