import requestAccessToken from './auth.js'
import fetchAllOffers from './fetchAllOffers.js'
import fetchOfferDetails from './fetchOfferDetails.js'
import fetchUserAccount from './user.js'
import { askQuestion, askPassword, rl, getAccountId } from './util.js'
import dotenv from 'dotenv'
import { existsSync } from 'fs'

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
        let date;
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
    const nightMatch = itineraryText.match(/^(\d+)\s+night/i);
    if (nightMatch) {
        return parseInt(nightMatch[1]);
    }
    return 0;
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

    // Extract from details offers
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
        if (filters.minDays && filters.minDays > 0) {
            if (sailing.nights !== undefined && sailing.nights !== null && sailing.nights > 0) {
                if (sailing.nights < filters.minDays) {
                    return false;
                }
            }
        }

        return true;
    });
}

/**
 * Creates a unique key for a sailing (ship + date)
 * @param {Object} sailing - Sailing object
 * @returns {string} - Unique key
 */
function getSailingKey(sailing) {
    return `${sailing.shipName}|${sailing.sailDate}`.toLowerCase();
}

/**
 * Validates date filters to ensure they are valid and end date is not before start date
 * @param {Object} filters - Filter object with startDate and/or endDate
 */
function validateDateFilters(filters) {
    if (filters.startDate && filters.endDate) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        if (isNaN(startDate.getTime())) {
            console.error(`❌ Error: Invalid start date format: ${filters.startDate}`);
            console.error('   Expected format: YYYY-MM-DD (e.g., 2025-01-01)');
            process.exit(1);
        }

        if (isNaN(endDate.getTime())) {
            console.error(`❌ Error: Invalid end date format: ${filters.endDate}`);
            console.error('   Expected format: YYYY-MM-DD (e.g., 2025-12-31)');
            process.exit(1);
        }

        if (endDate < startDate) {
            console.error(`❌ Error: End date (${filters.endDate}) cannot be before start date (${filters.startDate})`);
            process.exit(1);
        }
    }
}

/**
 * Parses command line arguments for filters
 * @returns {Object} - Filter object with ships, dates, and ports
 */
function parseFilters() {
    const filters = {};

    // Parse ships filter (--ships "ship1,ship2,ship3")
    const shipsIndex = process.argv.indexOf('--ships');
    if (shipsIndex !== -1 && process.argv[shipsIndex + 1]) {
        filters.ships = process.argv[shipsIndex + 1].split(',').map(ship => ship.trim());
    }

    // Parse start date filter (--start-date "2025-01-01")
    const startDateIndex = process.argv.indexOf('--start-date');
    if (startDateIndex !== -1 && process.argv[startDateIndex + 1]) {
        filters.startDate = process.argv[startDateIndex + 1];
    }

    // Parse end date filter (--end-date "2025-12-31")
    const endDateIndex = process.argv.indexOf('--end-date');
    if (endDateIndex !== -1 && process.argv[endDateIndex + 1]) {
        filters.endDate = process.argv[endDateIndex + 1];
    }

    // Parse ports filter (--ports "miami,fort lauderdale,port canaveral")
    const portsIndex = process.argv.indexOf('--ports');
    if (portsIndex !== -1 && process.argv[portsIndex + 1]) {
        filters.ports = process.argv[portsIndex + 1].split(',').map(port => port.trim());
    }

    // Parse minimum days filter (--min-days 5)
    const minDaysIndex = process.argv.indexOf('--min-days');
    if (minDaysIndex !== -1 && process.argv[minDaysIndex + 1]) {
        const minDays = parseInt(process.argv[minDaysIndex + 1], 10);
        if (!isNaN(minDays) && minDays > 0) {
            filters.minDays = minDays;
        }
    }

    // Parse output format filter (--format csv or --format json)
    const formatIndex = process.argv.indexOf('--format');
    if (formatIndex !== -1 && process.argv[formatIndex + 1]) {
        const format = process.argv[formatIndex + 1].toLowerCase();
        if (format === 'csv' || format === 'json') {
            filters.outputFormat = format;
        }
    }

    return filters;
}

/**
 * Fetches offers for a single user
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string} userLabel - Label for the user (e.g., "USER1", "USER2")
 * @returns {Promise<Object>} - Object with user info and offers with details
 */
async function fetchUserOffers(username, password, userLabel) {
    console.log(`\n🔐 Authenticating ${userLabel}...`);
    const tokenData = await requestAccessToken(username, password);
    const accessToken = tokenData?.access_token;
    if (!accessToken) {
        throw new Error(`No access token found for ${userLabel}`);
    }

    console.log(`📋 Fetching user account for ${userLabel}...`);
    const user = await fetchUserAccount(accessToken);

    console.log(`🎰 Fetching offers for ${userLabel}...`);
    const offers = await fetchAllOffers({
        accessToken,
        consumerId: user.payload.consumerId,
        cruiseLoyaltyId: user.payload.loyaltyInformation.crownAndAnchorId
    });

    console.log(`📊 Fetching offer details for ${userLabel} (${offers.offers.length} offers)...`);
    const offersWithDetails = await Promise.all(offers.offers.map(async (offer, index) => {
        try {
            console.log(`  Processing offer ${index + 1}/${offers.offers.length} for ${userLabel}...`);
            const details = await fetchOfferDetails({
                accessToken,
                requestBody: {
                    returnExcludedSailings: true,
                    brand: "R",
                    cruiseLoyaltyId: user.payload.loyaltyInformation.crownAndAnchorId,
                    offerCode: offer.campaignOffer.offerCode,
                    playerOfferId: offer.playerOfferId
                }
            });

            return {
                offer,
                details
            };
        } catch (e) {
            console.error(`❌ Error fetching details for offer ${offer.campaignOffer?.offerCode || 'unknown'}:`, e.message);
            return {
                offer,
                details: null,
                error: e.message
            };
        }
    }));

    return {
        userLabel,
        userInfo: {
            consumerId: user.payload.consumerId,
            crownAndAnchorId: user.payload.loyaltyInformation.crownAndAnchorId,
            accountId: getAccountId(accessToken)
        },
        offersWithDetails
    };
}

/**
 * Displays help information about filter options
 */
function showFilterHelp() {
    console.log(`
🔍 FILTER OPTIONS:
  --ships "ship1,ship2,ship3"     Filter by ship names (case-insensitive)
  --start-date "YYYY-MM-DD"      Filter sailings from this date onwards
  --end-date "YYYY-MM-DD"        Filter sailings up to this date
  --ports "port1,port2,port3"    Filter by departure ports (case-insensitive)
  --min-days N                    Filter sailings with minimum N nights
  --format csv|json               Output format for comparison results (default: json)

📝 EXAMPLES:
  node compare-users.js --ships "Serenade,Enchantment" --start-date "2025-10-01"
  node compare-users.js --ports "miami,fort lauderdale" --end-date "2025-12-31"
  node compare-users.js --ships "Utopia" --ports "port canaveral" --start-date "2025-09-01" --end-date "2025-11-30"
  node compare-users.js --min-days 7 --start-date "2025-06-01"
  node compare-users.js --format csv

⚠️  NOTE: This script requires USER1_USERNAME, USER1_PASSWORD, USER2_USERNAME, and USER2_PASSWORD
    to be set in your .env file or environment variables.
`);
}

// Load environment variables if .env file exists
if (existsSync('.env')) {
    dotenv.config();
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showFilterHelp();
    process.exit(0);
}

(async () => {
    try {
        // Get credentials from environment variables
        const user1Username = process.env.USER1_USERNAME;
        const user1Password = process.env.USER1_PASSWORD;
        const user2Username = process.env.USER2_USERNAME;
        const user2Password = process.env.USER2_PASSWORD;

        // Validate credentials
        if (!user1Username || !user1Password) {
            console.error('❌ Error: USER1_USERNAME and USER1_PASSWORD must be set in environment variables or .env file');
            process.exit(1);
        }

        if (!user2Username || !user2Password) {
            console.error('❌ Error: USER2_USERNAME and USER2_PASSWORD must be set in environment variables or .env file');
            process.exit(1);
        }

        // Parse and validate filters before making API calls
        const filters = parseFilters();
        validateDateFilters(filters);

        // Fetch offers for both users
        const [user1Data, user2Data] = await Promise.all([
            fetchUserOffers(user1Username, user1Password, 'USER1'),
            fetchUserOffers(user2Username, user2Password, 'USER2')
        ]);

        // Save raw offer data to files
        const fs = await import('fs');
        fs.writeFileSync('offers-user1.json', JSON.stringify(user1Data, null, 2));
        fs.writeFileSync('offers-user2.json', JSON.stringify(user2Data, null, 2));

        // Also save a combined file for easy comparison
        const combinedData = {
            user1: {
                userInfo: user1Data.userInfo,
                offerCount: user1Data.offersWithDetails.length,
                offers: user1Data.offersWithDetails
            },
            user2: {
                userInfo: user2Data.userInfo,
                offerCount: user2Data.offersWithDetails.length,
                offers: user2Data.offersWithDetails
            }
        };
        fs.writeFileSync('offers-combined.json', JSON.stringify(combinedData, null, 2));

        console.log('\n✅ Offer data saved:');
        console.log('  - offers-user1.json');
        console.log('  - offers-user2.json');
        console.log('  - offers-combined.json');

        // Display summary
        console.log('\n📊 SUMMARY:');
        console.log(`  USER1: ${user1Data.offersWithDetails.length} offers`);
        console.log(`  USER2: ${user2Data.offersWithDetails.length} offers`);

        // Display filters if any were applied
        if (Object.keys(filters).length > 0) {
            console.log('\n🔍 Filters applied:', filters);
        }

        // Determine output format (default to JSON)
        const outputFormat = filters.outputFormat || 'json';

        // Generate comparison report
        console.log('\n🔍 Generating comparison report...');

        // Extract offer codes for comparison
        const user1OfferCodes = new Set(
            user1Data.offersWithDetails
                .map(item => item.offer?.campaignOffer?.offerCode)
                .filter(Boolean)
        );
        const user2OfferCodes = new Set(
            user2Data.offersWithDetails
                .map(item => item.offer?.campaignOffer?.offerCode)
                .filter(Boolean)
        );

        const commonOfferCodes = [...user1OfferCodes].filter(code => user2OfferCodes.has(code));
        const user1OnlyCodes = [...user1OfferCodes].filter(code => !user2OfferCodes.has(code));
        const user2OnlyCodes = [...user2OfferCodes].filter(code => !user1OfferCodes.has(code));

        // Extract sailings from both users' offers
        console.log('⛵ Extracting cruise itineraries...');
        const user1Sailings = [];
        user1Data.offersWithDetails.forEach(offerWithDetails => {
            const sailings = extractSailingsFromOffer(offerWithDetails);
            user1Sailings.push(...sailings);
        });

        const user2Sailings = [];
        user2Data.offersWithDetails.forEach(offerWithDetails => {
            const sailings = extractSailingsFromOffer(offerWithDetails);
            user2Sailings.push(...sailings);
        });

        // Apply filters to sailings
        const filteredUser1Sailings = filterSailings(user1Sailings, filters);
        const filteredUser2Sailings = filterSailings(user2Sailings, filters);

        // Create maps for matching sailings
        const user1SailingMap = new Map();
        filteredUser1Sailings.forEach(sailing => {
            const key = getSailingKey(sailing);
            if (!user1SailingMap.has(key)) {
                user1SailingMap.set(key, []);
            }
            user1SailingMap.get(key).push(sailing);
        });

        const user2SailingMap = new Map();
        filteredUser2Sailings.forEach(sailing => {
            const key = getSailingKey(sailing);
            if (!user2SailingMap.has(key)) {
                user2SailingMap.set(key, []);
            }
            user2SailingMap.get(key).push(sailing);
        });

        // Find matching sailings (same ship + date)
        const matchingSailings = [];
        const user1OnlySailings = [];
        const user2OnlySailings = [];

        const comparisonReport = {
            summary: {
                user1TotalOffers: user1Data.offersWithDetails.length,
                user2TotalOffers: user2Data.offersWithDetails.length,
                commonOffers: commonOfferCodes.length,
                user1OnlyOffers: user1OnlyCodes.length,
                user2OnlyOffers: user2OnlyCodes.length,
                user1TotalSailings: filteredUser1Sailings.length,
                user2TotalSailings: filteredUser2Sailings.length,
                matchingItineraries: matchingSailings.length,
                user1OnlySailings: user1OnlySailings.length,
                user2OnlySailings: user2OnlySailings.length
            },
            user1: {
                userInfo: user1Data.userInfo,
                offerCodes: [...user1OfferCodes],
                uniqueOfferCodes: user1OnlyCodes
            },
            user2: {
                userInfo: user2Data.userInfo,
                offerCodes: [...user2OfferCodes],
                uniqueOfferCodes: user2OnlyCodes
            },
            common: {
                offerCodes: commonOfferCodes
            },
            itineraries: {
                matching: matchingSailings,
                user1Only: user1OnlySailings,
                user2Only: user2OnlySailings
            },
            filters: filters
        };

        // Display console report
        console.log(`
=== USER OFFER COMPARISON REPORT ===

OFFER SUMMARY:
- USER1 Total Offers: ${comparisonReport.summary.user1TotalOffers}
- USER2 Total Offers: ${comparisonReport.summary.user2TotalOffers}
- Common Offers: ${comparisonReport.summary.commonOffers}
- USER1 Only: ${comparisonReport.summary.user1OnlyOffers}
- USER2 Only: ${comparisonReport.summary.user2OnlyOffers}

⛵ CRUISE ITINERARY SUMMARY:
- USER1 Total Sailings: ${comparisonReport.summary.user1TotalSailings}
- USER2 Total Sailings: ${comparisonReport.summary.user2TotalSailings}
- Matching Itineraries: ${comparisonReport.summary.matchingItineraries}
- USER1 Only Sailings: ${comparisonReport.summary.user1OnlySailings}
- USER2 Only Sailings: ${comparisonReport.summary.user2OnlySailings}
`);

        if (commonOfferCodes.length > 0) {
            console.log(`\nCommon Offer Codes (${commonOfferCodes.length}):`);
            commonOfferCodes.slice(0, 10).forEach(code => console.log(`  - ${code}`));
            if (commonOfferCodes.length > 10) {
                console.log(`  ... and ${commonOfferCodes.length - 10} more`);
            }
        }

        if (user1OnlyCodes.length > 0) {
            console.log(`\nUSER1 Only Offer Codes (${user1OnlyCodes.length}):`);
            user1OnlyCodes.slice(0, 10).forEach(code => console.log(`  - ${code}`));
            if (user1OnlyCodes.length > 10) {
                console.log(`  ... and ${user1OnlyCodes.length - 10} more`);
            }
        }

        if (user2OnlyCodes.length > 0) {
            console.log(`\nUSER2 Only Offer Codes (${user2OnlyCodes.length}):`);
            user2OnlyCodes.slice(0, 10).forEach(code => console.log(`  - ${code}`));
            if (user2OnlyCodes.length > 10) {
                console.log(`  ... and ${user2OnlyCodes.length - 10} more`);
            }
        }

        // Display matching itineraries
        if (matchingSailings.length > 0) {
            console.log(`\n⛵ MATCHING ITINERARIES (${matchingSailings.length}):`);
            matchingSailings.slice(0, 10).forEach(match => {
                console.log(`\n  ${match.shipName} - ${match.sailDate}`);
                console.log(`    Departure Port: ${match.departurePort}`);
                console.log(`    Itinerary: ${match.itinerary}`);
                if (match.nights) {
                    console.log(`    Nights: ${match.nights}`);
                }
                console.log(`    USER1 Offers: ${match.user1Offers.join(', ')}`);
                console.log(`    USER2 Offers: ${match.user2Offers.join(', ')}`);
            });
            if (matchingSailings.length > 10) {
                console.log(`  ... and ${matchingSailings.length - 10} more matching itineraries`);
            }
        } else {
            console.log('\n⛵ No matching cruise itineraries found.');
        }

        if (user1OnlySailings.length > 0) {
            console.log(`\n⛵ USER1 ONLY SAILINGS (${user1OnlySailings.length}):`);
            user1OnlySailings.slice(0, 5).forEach(sailing => {
                console.log(`  - ${sailing.shipName} - ${sailing.sailDate} (${sailing.departurePort}) - ${sailing.offerCode}`);
            });
            if (user1OnlySailings.length > 5) {
                console.log(`  ... and ${user1OnlySailings.length - 5} more`);
            }
        }

        if (user2OnlySailings.length > 0) {
            console.log(`\n⛵ USER2 ONLY SAILINGS (${user2OnlySailings.length}):`);
            user2OnlySailings.slice(0, 5).forEach(sailing => {
                console.log(`  - ${sailing.shipName} - ${sailing.sailDate} (${sailing.departurePort}) - ${sailing.offerCode}`);
            });
            if (user2OnlySailings.length > 5) {
                console.log(`  ... and ${user2OnlySailings.length - 5} more`);
            }
        }

        // Save comparison report
        if (outputFormat === 'csv') {
            const escapeCSVValue = (value) => {
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            };

            // Create CSV for offer codes
            const offerCodeRows = [
                ['Offer Code', 'Available For USER1', 'Available For USER2', 'Status'],
                ...commonOfferCodes.map(code => [code, 'Yes', 'Yes', 'Common']),
                ...user1OnlyCodes.map(code => [code, 'Yes', 'No', 'USER1 Only']),
                ...user2OnlyCodes.map(code => [code, 'No', 'Yes', 'USER2 Only'])
            ];

            // Create CSV for matching itineraries
            const itineraryRows = [
                ['Ship Name', 'Sail Date', 'Departure Port', 'Itinerary', 'Nights', 'USER1 Offer Codes', 'USER2 Offer Codes', 'USER1 Offer Names', 'USER2 Offer Names', 'Status'],
                ...matchingSailings.map(match => [
                    match.shipName,
                    match.sailDate,
                    match.departurePort,
                    match.itinerary,
                    match.nights || '',
                    match.user1Offers.join('; '),
                    match.user2Offers.join('; '),
                    match.user1OfferNames.join('; '),
                    match.user2OfferNames.join('; '),
                    'Matching'
                ]),
                ...user1OnlySailings.map(sailing => [
                    sailing.shipName,
                    sailing.sailDate,
                    sailing.departurePort,
                    sailing.itinerary,
                    sailing.nights || '',
                    sailing.offerCode,
                    '',
                    sailing.offerName,
                    '',
                    'USER1 Only'
                ]),
                ...user2OnlySailings.map(sailing => [
                    sailing.shipName,
                    sailing.sailDate,
                    sailing.departurePort,
                    sailing.itinerary,
                    sailing.nights || '',
                    '',
                    sailing.offerCode,
                    '',
                    sailing.offerName,
                    'USER2 Only'
                ])
            ];

            // Combine both CSV sections with a header separator
            const csvContent = [
                '=== OFFER CODE COMPARISON ===',
                offerCodeRows.map(row => row.map(escapeCSVValue).join(',')).join('\n'),
                '',
                '=== CRUISE ITINERARY COMPARISON ===',
                itineraryRows.map(row => row.map(escapeCSVValue).join(',')).join('\n')
            ].join('\n');

            fs.writeFileSync('comparison-results.csv', csvContent);
            console.log('\n📊 Detailed comparison results saved to comparison-results.csv');
        } else {
            fs.writeFileSync('comparison-results.json', JSON.stringify(comparisonReport, null, 2));
            console.log('\n📊 Detailed comparison results saved to comparison-results.json');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        // Ensure readline interface is closed
        if (rl && !rl.closed) {
            rl.close();
        }
        // Force exit to prevent hanging
        process.exit(0);
    }
})();
