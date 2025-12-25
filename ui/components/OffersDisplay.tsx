'use client';

import { extractSailingsFromOffer, filterSailings, Sailing, Filters } from '@/lib/comparison';
import { useState, useMemo } from 'react';
import { OffersFilters as OffersFiltersType } from './OffersFilters';

export interface OffersDisplayProps {
    offers?: any[];
    user?: any;
    filters?: OffersFiltersType;
}

export default function OffersDisplay({ offers = [], user, filters }: OffersDisplayProps) {
    const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());

    if (!offers || offers.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <p className="text-gray-600">No offers available.</p>
            </div>
        );
    }

    const toggleOffer = (offerCode: string) => {
        const newExpanded = new Set(expandedOffers);
        if (newExpanded.has(offerCode)) {
            newExpanded.delete(offerCode);
        } else {
            newExpanded.add(offerCode);
        }
        setExpandedOffers(newExpanded);
    };

    // Extract all sailings from all offers
    const allSailings = useMemo(() => {
        return offers.flatMap(offer => extractSailingsFromOffer(offer));
    }, [offers]);

    // Get unique ships and ports from all sailings
    const uniqueShips = useMemo(() => {
        return Array.from(new Set(allSailings.map(s => s.shipName).filter(Boolean))).sort();
    }, [allSailings]);

    const uniquePorts = useMemo(() => {
        return Array.from(new Set(allSailings.map(s => s.departurePort).filter(Boolean))).sort();
    }, [allSailings]);

    // Filter sailings if filters are provided
    const filteredSailings = useMemo(() => {
        if (!filters || Object.keys(filters).length === 0) {
            return allSailings;
        }
        const filterParams: Filters = {
            ships: filters.ships,
            startDate: filters.startDate,
            endDate: filters.endDate,
            ports: filters.ports,
            minDays: filters.minDays,
        };
        return filterSailings(allSailings, filterParams);
    }, [allSailings, filters]);

    // Get unique offer codes from filtered sailings
    const uniqueOfferCodes = useMemo(() => {
        return Array.from(new Set(filteredSailings.map(s => s.offerCode).filter(Boolean)));
    }, [filteredSailings]);

    // Filter offers to only show those with matching sailings
    const filteredOffers = useMemo(() => {
        if (!filters || Object.keys(filters).length === 0) {
            return offers;
        }
        const filteredOfferCodes = new Set(filteredSailings.map(s => s.offerCode));
        return offers.filter(offer => {
            const offerCode = offer.offer?.campaignOffer?.offerCode;
            return offerCode && filteredOfferCodes.has(offerCode);
        });
    }, [offers, filteredSailings, filters]);

    return (
        <div className="space-y-6">
            {/* User Info */}
            {user && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h2 className="text-xl font-semibold mb-4 text-black">User Information</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-bold text-black">Consumer ID</p>
                            <p className="font-medium text-black">{user.payload?.consumerId || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-black">Crown & Anchor ID</p>
                            <p className="font-medium text-black">{user.payload?.loyaltyInformation?.crownAndAnchorId || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Statistics */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-black">Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Total Offers</p>
                        <p className="text-2xl text-black font-bold">
                            {filters && Object.keys(filters).length > 0 ? (
                                <>
                                    {filteredOffers.length} <span className="text-sm text-gray-500">of {offers.length}</span>
                                </>
                            ) : (
                                offers.length
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Unique Offer Codes</p>
                        <p className="text-2xl text-black font-bold">{uniqueOfferCodes.length}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total Sailings</p>
                        <p className="text-2xl text-black font-bold">
                            {filters && Object.keys(filters).length > 0 ? (
                                <>
                                    {filteredSailings.length} <span className="text-sm text-gray-500">of {allSailings.length}</span>
                                </>
                            ) : (
                                allSailings.length
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Unique Ships</p>
                        <p className="text-2xl text-black font-bold">{uniqueShips.length}</p>
                    </div>
                </div>
            </div>

            {/* Offers List */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-black">
                    {filters && Object.keys(filters).length > 0 ? 'Filtered Offers' : 'All Offers'}
                </h2>
                {filteredOffers.length === 0 ? (
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <p className="text-gray-600">No offers match the current filters.</p>
                    </div>
                ) : (
                    filteredOffers.map((offerWithDetails, index) => {
                        const offer = offerWithDetails.offer;
                        const details = offerWithDetails.details;
                        const offerCode = offer?.campaignOffer?.offerCode;
                        const offerName = offer?.campaignOffer?.name;
                        const isExpanded = offerCode && expandedOffers.has(offerCode);
                        const allOfferSailings = extractSailingsFromOffer(offerWithDetails);
                        // Filter sailings for this specific offer
                        const sailings = filters && Object.keys(filters).length > 0
                            ? filterSailings(allOfferSailings, filters as Filters)
                            : allOfferSailings;

                        if (!offer || !offer.campaignOffer) {
                            return (
                                <div key={index} className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                    <p className="text-yellow-800">Offer data incomplete or error: {offerWithDetails.error || 'Unknown error'}</p>
                                </div>
                            );
                        }

                        return (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                                <button
                                    onClick={() => offerCode && toggleOffer(offerCode)}
                                    className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-blue-600">{offerCode}</h3>
                                            {sailings.length > 0 && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                    {sailings.length} sailing{sailings.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-700 mt-1">{offerName}</p>
                                        {offer.campaignOffer.description && (
                                            <p className="text-sm text-gray-500 mt-1">{offer.campaignOffer.description}</p>
                                        )}
                                    </div>
                                    <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isExpanded && sailings.length > 0 && (
                                    <div className="border-t border-gray-200 p-4">
                                        <h4 className="font-semibold mb-3 text-black">Sailings ({sailings.length})</h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ship</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sail Date</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itinerary</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nights</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {sailings.map((sailing, sailingIndex) => (
                                                        <tr key={sailingIndex} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-black">{sailing.shipName || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-black">{sailing.sailDate || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-black">{sailing.departurePort || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-sm text-black">{sailing.itinerary || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-black">{sailing.nights > 0 ? `${sailing.nights} nights` : 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-black">
                                                                <span className={`px-2 py-1 text-xs rounded-full ${sailing.source === 'included' || sailing.source === 'details-included'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    {sailing.source || 'unknown'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {isExpanded && sailings.length === 0 && (
                                    <div className="border-t border-gray-200 p-4">
                                        <p className="text-gray-500 text-sm">No sailings found for this offer.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* All Sailings View */}
            {filteredSailings.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h2 className="text-2xl font-bold mb-4 text-black">
                        {filters && Object.keys(filters).length > 0 ? 'Filtered Sailings' : 'All Sailings'} ({filteredSailings.length}
                        {filters && Object.keys(filters).length > 0 && ` of ${allSailings.length}`})
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer Code</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ship</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sail Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itinerary</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nights</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSailings.slice(0, 100).map((sailing, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">{sailing.offerCode}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-black text-sm">{sailing.shipName || 'N/A'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-black text-sm">{sailing.sailDate || 'N/A'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-black text-sm">{sailing.departurePort || 'N/A'}</td>
                                        <td className="px-4 py-3 text-black text-sm">{sailing.itinerary || 'N/A'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-black text-sm">{sailing.nights > 0 ? `${sailing.nights} nights` : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredSailings.length > 100 && (
                            <p className="mt-4 text-sm text-gray-600">
                                Showing first 100 of {filteredSailings.length} sailings
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

