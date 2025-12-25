import { readFileSync } from 'fs';

/**
 * Normalizes ship names to handle variations in naming conventions
 * @param {string} shipName - The ship name to normalize
 * @returns {string} - Normalized ship name
 */
function normalizeShipName(shipName) {
    if (!shipName) return '';

    return shipName.charAt(0).toUpperCase() + shipName.slice(1)
        .replace(/of the seas/gi, 'Of The Seas')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Normalizes date strings to YYYY-MM-DD format for comparison
 * @param {string} dateStr - Date string in various formats
 * @returns {string} - Normalized date string or empty string if invalid
 */
function normalizeDate(dateStr) {
    if (!dateStr) return '';

    try {
        // Handle various date formats
        let date;

        if (dateStr.includes('T')) {
            // ISO format like "2026-09-07" or "2026-09-07T00:00:00.000Z"
            date = new Date(dateStr.split('T')[0]);
        } else if (dateStr.includes(',')) {
            // Format like "October 2, 2025"
            date = new Date(dateStr);
        } else {
            // Assume it's already in YYYY-MM-DD format
            date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) return '';

        return date.toISOString().split('T')[0];
    } catch (error) {
        console.warn(`Failed to normalize date: ${dateStr}`, error.message);
        return '';
    }
}

/**
 * Extracts the number of nights from itinerary descriptions
 * @param {string} itineraryText - Itinerary text that may contain night information
 * @returns {number} - Number of nights, or 0 if not found
 */
function extractNights(itineraryText) {
    if (!itineraryText) return 0;

    // Look for patterns like "3 Night", "4 NIGHT", "10 Night", etc.
    // Handles both CSV format: "3 Night Miami To Panama Cruise" 
    // and JSON format: "4 NIGHT BAHAMAS GETAWAY CRUISE"
    const nightMatch = itineraryText.match(/^(\d+)\s+night/i);
    if (nightMatch) {
        return parseInt(nightMatch[1]);
    }

    return 0;
}

/**
 * Parses CSV data and returns structured offer data
 * @param {string} csvContent - Raw CSV content
 * @returns {Array} - Array of parsed offer objects
 */
function parseBounceBackCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;

        // Parse CSV line handling quoted values with commas
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

        const offer = {};
        headers.forEach((header, index) => {
            offer[header] = values[index] || '';
        });

        return offer;
    });
}

/**
 * Extracts sailing information from API offer data
 * @param {Object} offerWithDetails - Combined offer and details data
 * @returns {Array} - Array of sailing objects
 */
function extractSailingsFromOffer(offerWithDetails) {
    const sailings = [];
    const { offer, details } = offerWithDetails;

    // Extract from included sailings in main offer
    if (offer.campaignOffer && offer.campaignOffer.sailings) {
        offer.campaignOffer.sailings.forEach(sailing => {
            // Filter: only include sailings with non-null roomType
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

    // Extract from excluded sailings in main offer
    if (offer.campaignOffer && offer.campaignOffer.excludedSailings) {
        offer.campaignOffer.excludedSailings.forEach(sailing => {
            // Filter: only include sailings with non-null roomType
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

    // Extract from details offers - this is where the sailing data actually is
    if (details && details.offers) {
        details.offers.forEach(detailOffer => {
            if (detailOffer.campaignOffer && detailOffer.campaignOffer.sailings) {
                detailOffer.campaignOffer.sailings.forEach(sailing => {
                    // Filter: only include sailings with non-null roomType
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

            if (detailOffer.campaignOffer && detailOffer.campaignOffer.excludedSailings) {
                detailOffer.campaignOffer.excludedSailings.forEach(sailing => {
                    // Filter: only include sailings with non-null roomType
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

/**
 * Filters sailings based on provided criteria
 * @param {Array} sailings - Array of sailing objects
 * @param {Object} filters - Filter criteria
 * @returns {Array} - Filtered sailings
 */
function filterSailings(sailings, filters = {}) {
    if (!filters || Object.keys(filters).length === 0) {
        return sailings;
    }

    return sailings.filter(sailing => {
        // Filter by ship names (case-insensitive)
        if (filters.ships && filters.ships.length > 0) {
            const shipMatch = filters.ships.some(filterShip =>
                sailing.shipName.toLowerCase().includes(filterShip.toLowerCase()) ||
                filterShip.toLowerCase().includes(sailing.shipName.toLowerCase())
            );
            if (!shipMatch) return false;
        }

        // Filter by date range
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

        // Filter by departure ports (case-insensitive)
        if (filters.ports && filters.ports.length > 0) {
            const portMatch = filters.ports.some(filterPort =>
                sailing.departurePort.toLowerCase().includes(filterPort.toLowerCase()) ||
                filterPort.toLowerCase().includes(sailing.departurePort.toLowerCase())
            );
            if (!portMatch) return false;
        }

        // Filter by minimum number of nights
        // Note: Skip this filter if nights data is missing (API data issue)
        if (filters.minDays && filters.minDays > 0) {
            // Only apply min-days filter if we have valid nights data
            // This prevents filtering out API sailings due to missing itinerary information
            if (sailing.nights !== undefined && sailing.nights !== null && sailing.nights > 0) {
                if (sailing.nights < filters.minDays) {
                    return false;
                }
            }
            // If nights data is missing (0 or null), we skip the filter to avoid excluding valid sailings
        }

        return true;
    });
}

/**
 * Compares API offers against bounce-back CSV offers to find overlaps
 * @param {Array} apiOffers - Array of API offer data
 * @param {Object} filters - Optional filters for ships, dates, and ports
 * @param {string} csvFilePath - Path to the bounce-back CSV file
 * @returns {Object} - Comparison results with overlaps and statistics
 */
export function compareOffersWithBounceBack(apiOffers, filters = {}, csvFilePath = './bounce-back.csv') {
    try {
        // Read and parse CSV data
        const csvContent = readFileSync(csvFilePath, 'utf8');
        const bounceBackOffers = parseBounceBackCSV(csvContent);

        // Extract all sailings from API offers
        const apiSailings = [];
        apiOffers.forEach(offerWithDetails => {
            const sailings = extractSailingsFromOffer(offerWithDetails);
            apiSailings.push(...sailings);
        });

        // Normalize bounce-back data
        const normalizedBounceBack = bounceBackOffers.map(offer => ({
            shipName: normalizeShipName(offer.Ship),
            sailDate: normalizeDate(offer['Sail Date']),
            departurePort: offer['Departure Port'] || '',
            itinerary: offer.Itinerary || '',
            nights: extractNights(offer.Itinerary || ''),
            offerCode: offer['Offer Code'] || '',
            stateroomType: offer['Stateroom Type'] || '',
            offerType: offer['Offer Type'] || '',
            nextCruiseBonus: offer['Next Cruise Bonus'] || ''
        }));

        // Apply filters to both datasets
        const filteredApiSailings = filterSailings(apiSailings, filters);
        const filteredBounceBack = filterSailings(normalizedBounceBack, filters);

        // Find overlaps by ship and date
        const overlaps = [];
        const overlapStats = {
            totalApiSailings: apiSailings.length,
            filteredApiSailings: filteredApiSailings.length,
            totalBounceBackOffers: normalizedBounceBack.length,
            filteredBounceBackOffers: filteredBounceBack.length,
            totalOverlaps: 0,
            uniqueShips: new Set(),
            dateRange: { earliest: null, latest: null },
            filtersApplied: filters
        };

        filteredApiSailings.forEach(apiSailing => {
            filteredBounceBack.forEach(bounceOffer => {
                // Check for exact ship name and date match
                if (apiSailing.shipName === bounceOffer.shipName &&
                    apiSailing.sailDate === bounceOffer.sailDate &&
                    apiSailing.sailDate !== '') {

                    overlaps.push({
                        shipName: apiSailing.shipName,
                        sailDate: apiSailing.sailDate,
                        departurePort: apiSailing.departurePort || bounceOffer.departurePort,
                        itinerary: apiSailing.itinerary || bounceOffer.itinerary,
                        apiOffer: {
                            offerCode: apiSailing.offerCode,
                            offerName: apiSailing.offerName,
                            source: apiSailing.source
                        },
                        bounceBackOffer: {
                            offerCode: bounceOffer.offerCode,
                            stateroomType: bounceOffer.stateroomType,
                            offerType: bounceOffer.offerType,
                            nextCruiseBonus: bounceOffer.nextCruiseBonus
                        }
                    });

                    overlapStats.uniqueShips.add(apiSailing.shipName);

                    // Track date range
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
        overlapStats.uniqueShipsCount = overlapStats.uniqueShips.size;

        return {
            overlaps,
            stats: overlapStats,
            allApiSailings: apiSailings,
            allBounceBackOffers: normalizedBounceBack,
            filteredApiSailings,
            filteredBounceBackOffers: filteredBounceBack
        };

    } catch (error) {
        console.error('Error comparing offers:', error);
        throw error;
    }
}

/**
 * Formats comparison results as CSV
 * @param {Object} comparisonResults - Results from compareOffersWithBounceBack
 * @returns {string} - CSV formatted data
 */
export function formatComparisonResultsAsCSV(comparisonResults) {
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

    // Escape CSV values (handle commas and quotes)
    const escapeCSVValue = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const csvContent = [
        csvHeaders.map(escapeCSVValue).join(','),
        ...csvRows.map(row => row.map(escapeCSVValue).join(','))
    ].join('\n');

    return csvContent;
}

/**
 * Formats comparison results for display
 * @param {Object} comparisonResults - Results from compareOffersWithBounceBack
 * @returns {string} - Formatted report
 */
export function formatComparisonReport(comparisonResults) {
    const { overlaps, stats } = comparisonResults;

    let report = `
=== OFFER COMPARISON REPORT ===

STATISTICS:
- Total API Sailings: ${stats.totalApiSailings}
- Filtered API Sailings: ${stats.filteredApiSailings || stats.totalApiSailings}
- Total Bounce-Back Offers: ${stats.totalBounceBackOffers}
- Filtered Bounce-Back Offers: ${stats.filteredBounceBackOffers || stats.totalBounceBackOffers}
- Total Overlaps Found: ${stats.totalOverlaps}
- Unique Ships with Overlaps: ${stats.uniqueShipsCount}
- Date Range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`;

    // Show applied filters if any
    if (stats.filtersApplied && Object.keys(stats.filtersApplied).length > 0) {
        report += `\n\nFILTERS APPLIED:`;
        if (stats.filtersApplied.ships && stats.filtersApplied.ships.length > 0) {
            report += `\n- Ships: ${stats.filtersApplied.ships.join(', ')}`;
        }
        if (stats.filtersApplied.startDate) {
            report += `\n- Start Date: ${stats.filtersApplied.startDate}`;
        }
        if (stats.filtersApplied.endDate) {
            report += `\n- End Date: ${stats.filtersApplied.endDate}`;
        }
        if (stats.filtersApplied.ports && stats.filtersApplied.ports.length > 0) {
            report += `\n- Ports: ${stats.filtersApplied.ports.join(', ')}`;
        }
        if (stats.filtersApplied.minDays && stats.filtersApplied.minDays > 0) {
            report += `\n- Minimum Days: ${stats.filtersApplied.minDays}`;
        }
    }

    report += `\n\nOVERLAPS BY SHIP AND DATE:
`;

    if (overlaps.length === 0) {
        report += 'No overlapping ships and dates found between API offers and bounce-back offers.\n';
    } else {
        // Group overlaps by ship for better readability
        const groupedOverlaps = overlaps.reduce((acc, overlap) => {
            if (!acc[overlap.shipName]) {
                acc[overlap.shipName] = [];
            }
            acc[overlap.shipName].push(overlap);
            return acc;
        }, {});

        Object.entries(groupedOverlaps).forEach(([shipName, shipOverlaps]) => {
            report += `\n${shipName.toUpperCase()}:\n`;
            shipOverlaps.forEach(overlap => {
                report += `  - ${overlap.sailDate}: ${overlap.departurePort}\n`;
                report += `    API: ${overlap.apiOffer.offerCode} (${overlap.apiOffer.offerName}) [${overlap.apiOffer.source}]\n`;
                report += `    Bounce-Back: ${overlap.bounceBackOffer.offerCode} - ${overlap.bounceBackOffer.offerType}\n`;
                if (overlap.bounceBackOffer.nextCruiseBonus) {
                    report += `    Bonus: ${overlap.bounceBackOffer.nextCruiseBonus}\n`;
                }
                report += `    Itinerary: ${overlap.itinerary}\n`;
            });
        });
    }

    return report;
}
