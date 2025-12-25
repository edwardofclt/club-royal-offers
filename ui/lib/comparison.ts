export interface Sailing {
    shipName: string;
    sailDate: string;
    departurePort: string;
    itinerary: string;
    nights: number;
    offerCode: string;
    offerName: string;
    source?: string;
}

export interface Filters {
    ships?: string[];
    startDate?: string;
    endDate?: string;
    ports?: string[];
    minDays?: number;
    offerCodePrefix?: string;
}

export interface ComparisonResult {
    overlaps: Overlap[];
    stats: ComparisonStats;
    allApiSailings: Sailing[];
    allBounceBackOffers: Sailing[];
    filteredApiSailings: Sailing[];
    filteredBounceBackOffers: Sailing[];
}

export interface Overlap {
    shipName: string;
    sailDate: string;
    departurePort: string;
    itinerary: string;
    apiOffer: {
        offerCode: string;
        offerName: string;
        source: string;
    };
    bounceBackOffer: {
        offerCode: string;
        stateroomType: string;
        offerType: string;
        nextCruiseBonus: string;
    };
}

export interface ComparisonStats {
    totalApiSailings: number;
    filteredApiSailings: number;
    totalBounceBackOffers: number;
    filteredBounceBackOffers: number;
    totalOverlaps: number;
    uniqueShipsCount: number;
    dateRange: {
        earliest: string | null;
        latest: string | null;
    };
    filtersApplied: Filters;
}

export function normalizeShipName(shipName: string): string {
    if (!shipName) return '';
    return shipName.charAt(0).toUpperCase() + shipName.slice(1)
        .replace(/of the seas/gi, 'Of The Seas')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
        let date: Date;
        if (dateStr.includes('T')) {
            date = new Date(dateStr.split('T')[0]);
        } else if (dateStr.includes(',')) {
            date = new Date(dateStr);
        } else {
            date = new Date(dateStr);
        }
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.warn(`Failed to normalize date: ${dateStr}`, error);
        return '';
    }
}

export function extractNights(itineraryText: string): number {
    if (!itineraryText) return 0;
    const nightMatch = itineraryText.match(/^(\d+)\s+night/i);
    if (nightMatch) {
        return parseInt(nightMatch[1], 10);
    }
    return 0;
}

export function parseBounceBackCSV(csvContent: string): Record<string, string>[] {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/"/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/"/g, ''));

        const offer: Record<string, string> = {};
        headers.forEach((header, index) => {
            offer[header] = values[index] || '';
        });

        return offer;
    });
}

export function extractSailingsFromOffer(offerWithDetails: any): Sailing[] {
    const sailings: Sailing[] = [];
    const { offer, details } = offerWithDetails;

    if (offer.campaignOffer?.sailings) {
        offer.campaignOffer.sailings.forEach((sailing: any) => {
            if (sailing.roomType != null) {
                sailings.push({
                    shipName: normalizeShipName(sailing.shipName),
                    sailDate: normalizeDate(sailing.sailDate),
                    departurePort: sailing.departurePort?.name || '',
                    itinerary: sailing.itineraryName || '',
                    nights: extractNights(sailing.itineraryDescription || sailing.itineraryName || ''),
                    offerCode: offer.campaignOffer.offerCode,
                    offerName: offer.campaignOffer.name,
                    source: 'included'
                });
            }
        });
    }

    if (offer.campaignOffer?.excludedSailings) {
        offer.campaignOffer.excludedSailings.forEach((sailing: any) => {
            if (sailing.roomType != null) {
                sailings.push({
                    shipName: normalizeShipName(sailing.shipName),
                    sailDate: normalizeDate(sailing.sailDate),
                    departurePort: sailing.departurePort?.name || '',
                    itinerary: sailing.itineraryName || '',
                    nights: extractNights(sailing.itineraryDescription || sailing.itineraryName || ''),
                    offerCode: offer.campaignOffer.offerCode,
                    offerName: offer.campaignOffer.name,
                    source: 'excluded'
                });
            }
        });
    }

    if (details?.offers) {
        details.offers.forEach((detailOffer: any) => {
            if (detailOffer.campaignOffer?.sailings) {
                detailOffer.campaignOffer.sailings.forEach((sailing: any) => {
                    if (sailing.roomType != null) {
                        sailings.push({
                            shipName: normalizeShipName(sailing.shipName),
                            sailDate: normalizeDate(sailing.sailDate),
                            departurePort: sailing.departurePort?.name || '',
                            itinerary: sailing.itineraryName || '',
                            nights: extractNights(sailing.itineraryDescription || sailing.itineraryName || ''),
                            offerCode: detailOffer.campaignOffer.offerCode,
                            offerName: detailOffer.campaignOffer.name,
                            source: 'details-included'
                        });
                    }
                });
            }

            if (detailOffer.campaignOffer?.excludedSailings) {
                detailOffer.campaignOffer.excludedSailings.forEach((sailing: any) => {
                    if (sailing.roomType != null) {
                        sailings.push({
                            shipName: normalizeShipName(sailing.shipName),
                            sailDate: normalizeDate(sailing.sailDate),
                            departurePort: sailing.departurePort?.name || '',
                            itinerary: sailing.itineraryName || '',
                            nights: extractNights(sailing.itineraryDescription || sailing.itineraryName || ''),
                            offerCode: detailOffer.campaignOffer.offerCode,
                            offerName: detailOffer.campaignOffer.name,
                            source: 'details-excluded'
                        });
                    }
                });
            }
        });
    }

    return sailings;
}

export function filterSailings(sailings: Sailing[], filters: Filters = {}): Sailing[] {
    if (!filters || Object.keys(filters).length === 0) {
        return sailings;
    }

    return sailings.filter(sailing => {
        if (filters.ships && filters.ships.length > 0) {
            const shipMatch = filters.ships.some(filterShip =>
                sailing.shipName.toLowerCase().includes(filterShip.toLowerCase()) ||
                filterShip.toLowerCase().includes(sailing.shipName.toLowerCase())
            );
            if (!shipMatch) return false;
        }

        if (filters.startDate || filters.endDate) {
            if (!sailing.sailDate) return false;
            const sailingDate = new Date(sailing.sailDate);
            if (isNaN(sailingDate.getTime())) return false;

            if (filters.startDate) {
                const startDate = new Date(filters.startDate);
                if (sailingDate < startDate) return false;
            }

            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                if (sailingDate > endDate) return false;
            }
        }

        if (filters.ports && filters.ports.length > 0) {
            const portMatch = filters.ports.some(filterPort =>
                sailing.departurePort.toLowerCase().includes(filterPort.toLowerCase()) ||
                filterPort.toLowerCase().includes(sailing.departurePort.toLowerCase())
            );
            if (!portMatch) return false;
        }

        if (filters.minDays && filters.minDays > 0) {
            if (sailing.nights !== undefined && sailing.nights !== null && sailing.nights > 0) {
                if (sailing.nights < filters.minDays) {
                    return false;
                }
            }
        }

        if (filters.offerCodePrefix && filters.offerCodePrefix.trim()) {
            const prefix = filters.offerCodePrefix.trim().toUpperCase();
            if (!sailing.offerCode || sailing.offerCode.length < 5) {
                return false;
            }
            const sailingPrefix = sailing.offerCode.slice(0, 5).toUpperCase();
            if (sailingPrefix !== prefix) {
                return false;
            }
        }

        return true;
    });
}

export function compareOffersWithBounceBack(
    apiOffers: any[],
    filters: Filters = {},
    csvContent: string
): ComparisonResult {
    const bounceBackOffers = parseBounceBackCSV(csvContent);

    const apiSailings: Sailing[] = [];
    apiOffers.forEach(offerWithDetails => {
        const sailings = extractSailingsFromOffer(offerWithDetails);
        apiSailings.push(...sailings);
    });

    interface BounceBackSailing extends Sailing {
        originalData: Record<string, string>;
    }

    const normalizedBounceBack: BounceBackSailing[] = bounceBackOffers.map(offer => ({
        shipName: normalizeShipName(offer.Ship || ''),
        sailDate: normalizeDate(offer['Sail Date'] || ''),
        departurePort: offer['Departure Port'] || '',
        itinerary: offer.Itinerary || '',
        nights: extractNights(offer.Itinerary || ''),
        offerCode: offer['Offer Code'] || '',
        offerName: '', // Bounce-back doesn't have offer name
        originalData: offer, // Store original data for access later
    }));

    const filteredApiSailings = filterSailings(apiSailings, filters);
    const filteredBounceBack = filterSailings(normalizedBounceBack, filters) as BounceBackSailing[];

    const overlaps: Overlap[] = [];
    const overlapStats: ComparisonStats = {
        totalApiSailings: apiSailings.length,
        filteredApiSailings: filteredApiSailings.length,
        totalBounceBackOffers: normalizedBounceBack.length,
        filteredBounceBackOffers: filteredBounceBack.length,
        totalOverlaps: 0,
        uniqueShipsCount: 0,
        dateRange: { earliest: null, latest: null },
        filtersApplied: filters
    };

    const uniqueShips = new Set<string>();

    filteredApiSailings.forEach(apiSailing => {
        filteredBounceBack.forEach((bounceOffer) => {
            if (apiSailing.shipName === bounceOffer.shipName &&
                apiSailing.sailDate === bounceOffer.sailDate &&
                apiSailing.sailDate !== '') {

                const bounceBackData = bounceOffer.originalData || {};
                overlaps.push({
                    shipName: apiSailing.shipName,
                    sailDate: apiSailing.sailDate,
                    departurePort: apiSailing.departurePort || bounceOffer.departurePort,
                    itinerary: apiSailing.itinerary || bounceOffer.itinerary,
                    apiOffer: {
                        offerCode: apiSailing.offerCode,
                        offerName: apiSailing.offerName,
                        source: apiSailing.source || ''
                    },
                    bounceBackOffer: {
                        offerCode: bounceOffer.offerCode,
                        stateroomType: bounceBackData['Stateroom Type'] || '',
                        offerType: bounceBackData['Offer Type'] || '',
                        nextCruiseBonus: bounceBackData['Next Cruise Bonus'] || ''
                    }
                });

                uniqueShips.add(apiSailing.shipName);

                if (!overlapStats.dateRange.earliest || apiSailing.sailDate < overlapStats.dateRange.earliest) {
                    overlapStats.dateRange.earliest = apiSailing.sailDate;
                }
                if (!overlapStats.dateRange.latest || apiSailing.sailDate > overlapStats.dateRange.latest) {
                    overlapStats.dateRange.latest = apiSailing.sailDate;
                }
            }
        });
    });

    overlapStats.totalOverlaps = overlaps.length;
    overlapStats.uniqueShipsCount = uniqueShips.size;

    return {
        overlaps,
        stats: overlapStats,
        allApiSailings: apiSailings,
        allBounceBackOffers: normalizedBounceBack,
        filteredApiSailings,
        filteredBounceBackOffers: filteredBounceBack
    };
}

export function formatComparisonResultsAsCSV(comparisonResults: ComparisonResult): string {
    const { overlaps } = comparisonResults;

    if (overlaps.length === 0) {
        return 'Ship Name,Sail Date,Departure Port,Itinerary,API Offer Code,API Offer Name,API Source,Bounce-Back Offer Code,Stateroom Type,Offer Type,Next Cruise Bonus';
    }

    const csvHeaders = [
        'Ship Name',
        'Sail Date',
        'Departure Port',
        'Itinerary',
        'API Offer Code',
        'API Offer Name',
        'API Source',
        'Bounce-Back Offer Code',
        'Stateroom Type',
        'Offer Type',
        'Next Cruise Bonus'
    ];

    const escapeCSVValue = (value: any): string => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const csvRows = overlaps.map(overlap => [
        overlap.shipName || '',
        overlap.sailDate || '',
        overlap.departurePort || '',
        overlap.itinerary || '',
        overlap.apiOffer.offerCode || '',
        overlap.apiOffer.offerName || '',
        overlap.apiOffer.source || '',
        overlap.bounceBackOffer.offerCode || '',
        overlap.bounceBackOffer.stateroomType || '',
        overlap.bounceBackOffer.offerType || '',
        overlap.bounceBackOffer.nextCruiseBonus || ''
    ]);

    const csvContent = [
        csvHeaders.map(escapeCSVValue).join(','),
        ...csvRows.map(row => row.map(escapeCSVValue).join(','))
    ].join('\n');

    return csvContent;
}

// Helper function to get offer info from offers array
function getOfferInfo(offers: any[], offerCode: string): { name: string; description: string } | null {
    for (const offerWithDetails of offers) {
        const offer = offerWithDetails.offer;
        if (offer?.campaignOffer?.offerCode === offerCode) {
            return {
                name: offer.campaignOffer.name || '',
                description: offer.campaignOffer.description || ''
            };
        }
        // Also check in details
        if (offerWithDetails.details?.offers) {
            for (const detailOffer of offerWithDetails.details.offers) {
                if (detailOffer?.campaignOffer?.offerCode === offerCode) {
                    return {
                        name: detailOffer.campaignOffer.name || '',
                        description: detailOffer.campaignOffer.description || ''
                    };
                }
            }
        }
    }
    return null;
}

// User comparison functions
export function compareUserOffers(user1Offers: any[], user2Offers: any[]): any {
    const user1Sailings = user1Offers.flatMap(offer => extractSailingsFromOffer(offer));
    const user2Sailings = user2Offers.flatMap(offer => extractSailingsFromOffer(offer));

    const user1OfferCodes = Array.from(new Set(user1Sailings.map(s => s.offerCode)));
    const user2OfferCodes = Array.from(new Set(user2Sailings.map(s => s.offerCode)));

    const user1OnlyCodes: Array<{ code: string; name: string; description: string }> = []
    const user2OnlyCodes: Array<{ code: string; name: string; description: string }> = user2OfferCodes.map(code => {
        const info = getOfferInfo(user2Offers, code);
        return { code, name: info?.name || '', description: info?.description || '' };
    })
    const commonOfferCodes: Array<{ code: string; name: string; description: string }> = []

    // Helper function to get first 5 characters for comparison
    const getOfferPrefix = (code: string): string => {
        return code.slice(0, 5).toUpperCase();
    };

    user1OfferCodes.forEach((code) => {
        const codePrefix = getOfferPrefix(code);
        const matchingCodeIndex = user2OnlyCodes.findIndex((val) => getOfferPrefix(val.code) === codePrefix);
        if (matchingCodeIndex !== -1) {
            const matchingCode = user2OnlyCodes[matchingCodeIndex];
            const info = getOfferInfo(user1Offers, code);
            commonOfferCodes.push({
                code,
                name: info?.name || matchingCode.name || '',
                description: info?.description || matchingCode.description || ''
            });
            user2OnlyCodes.splice(matchingCodeIndex, 1);
            return;
        }
        const info = getOfferInfo(user1Offers, code);
        user1OnlyCodes.push({
            code,
            name: info?.name || '',
            description: info?.description || ''
        });
    })


    // const commonOfferCodes = Array.from(user1OfferCodes).filter(code => );
    // const user1OnlyCodes = Array.from(user1OfferCodes).filter(code => !user2OfferCodes.some((val) => val.startsWith(code.slice(0, -2))));
    // const user2OnlyCodes = Array.from(user2OfferCodes).filter(code => !user1OfferCodes.some((val) => val.startsWith(code.slice(0, -2))));

    const getSailingKey = (sailing: Sailing) => `${sailing.shipName}|${sailing.sailDate}`.toLowerCase();

    const user1SailingsMap = new Map<string, Sailing[]>();
    user1Sailings.forEach(sailing => {
        const key = getSailingKey(sailing);
        if (!user1SailingsMap.has(key)) {
            user1SailingsMap.set(key, []);
        }
        user1SailingsMap.get(key)!.push(sailing);
    });

    const user2SailingsMap = new Map<string, Sailing[]>();
    user2Sailings.forEach(sailing => {
        const key = getSailingKey(sailing);
        if (!user2SailingsMap.has(key)) {
            user2SailingsMap.set(key, []);
        }
        user2SailingsMap.get(key)!.push(sailing);
    });

    const matchingSailings: any[] = [];
    const user1OnlySailings: Sailing[] = [];
    const user2OnlySailings: Sailing[] = [];

    user1SailingsMap.forEach((sailings, key) => {
        if (user2SailingsMap.has(key)) {
            // Find all distinct user1/user2 offer pairs for this sailing
            const user2SailingsForKey = user2SailingsMap.get(key)!;

            // Map offer code -> offer name and description for all user1 and user2 sailings on this date/ship
            const user1OfferCodes: string[] = [];
            const user1OfferNames: string[] = [];
            const user1OfferDescriptions: string[] = [];
            sailings.forEach(s => {
                if (!user1OfferCodes.includes(s.offerCode)) {
                    user1OfferCodes.push(s.offerCode);
                    user1OfferNames.push(s.offerName);
                    const info = getOfferInfo(user1Offers, s.offerCode);
                    user1OfferDescriptions.push(info?.description || '');
                }
            });

            const user2OfferCodes: string[] = [];
            const user2OfferNames: string[] = [];
            const user2OfferDescriptions: string[] = [];
            user2SailingsForKey.forEach(s => {
                if (!user2OfferCodes.includes(s.offerCode)) {
                    user2OfferCodes.push(s.offerCode);
                    user2OfferNames.push(s.offerName);
                    const info = getOfferInfo(user2Offers, s.offerCode);
                    user2OfferDescriptions.push(info?.description || '');
                }
            });

            // Collapse: one record per sailing, with arrays of user1/user2 offerCodes/offerNames/descriptions
            matchingSailings.push({
                shipName: sailings[0].shipName,
                sailDate: sailings[0].sailDate,
                departurePort: sailings[0].departurePort,
                itinerary: sailings[0].itinerary,
                nights: sailings[0].nights,
                user1Offers: user1OfferCodes,
                user2Offers: user2OfferCodes,
                user1OfferNames,
                user2OfferNames,
                user1OfferDescriptions,
                user2OfferDescriptions,
            });
        } else {
            user1OnlySailings.push(...sailings);
        }
    });

    user2SailingsMap.forEach((sailings, key) => {
        if (!user1SailingsMap.has(key)) {
            user2OnlySailings.push(...sailings);
        }
    });

    return {
        commonOfferCodes,
        user1OnlyCodes,
        user2OnlyCodes,
        matchingSailings,
        user1OnlySailings,
        user2OnlySailings,
        stats: {
            totalUser1Offers: user1OfferCodes.length,
            totalUser2Offers: user2OfferCodes.length,
            commonOffers: commonOfferCodes.length,
            user1Only: user1OnlyCodes.length,
            user2Only: user2OnlyCodes.length,
            matchingSailings: matchingSailings.length
        }
    };
}

