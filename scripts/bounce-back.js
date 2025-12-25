import requestAccessToken from './auth.js'
import fetchAllOffers from './fetchAllOffers.js'
import fetchOfferDetails from './fetchOfferDetails.js'
// import fetchOffers from './fetchAllOffers.js'
import fetchUserAccount from './user.js'
import { askQuestion, askPassword, rl, getAccountId } from './util.js'
import { compareOffersWithBounceBack, formatComparisonReport, formatComparisonResultsAsCSV } from './offerComparison.js'
import dotenv from 'dotenv'
import { existsSync } from 'fs'

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

  // Parse CSV file path (--csv-file "path/to/file.csv")
  const csvFileIndex = process.argv.indexOf('--csv-file');
  if (csvFileIndex !== -1 && process.argv[csvFileIndex + 1]) {
    filters.csvFilePath = process.argv[csvFileIndex + 1];
  }

  return filters;
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
  --format csv|json               Output format for comparison results (default: csv)
  --csv-file "path/to/file.csv"  Path to bounce-back CSV file (default: ./bounce-back.csv)

📝 EXAMPLES:
  node index.js --ships "Serenade,Enchantment" --start-date "2025-10-01"
  node index.js --ports "miami,fort lauderdale" --end-date "2025-12-31"
  node index.js --ships "Utopia" --ports "port canaveral" --start-date "2025-09-01" --end-date "2025-11-30"
  node index.js --min-days 7 --start-date "2025-06-01"
  node index.js --ships "Serenade" --min-days 5 --ports "Miami"
  node index.js --format json
  node index.js --ships "Serenade" --format csv
  node index.js --csv-file "./my-offers.csv" --ships "Utopia"
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
  let username, password;

  try {
    // Check if credentials are available in environment variables
    if (process.env.USER1_USERNAME && process.env.USER1_PASSWORD) {
      username = process.env.USER1_USERNAME;
      password = process.env.USER1_PASSWORD;
    } else {
      // Fall back to prompting user for credentials
      username = await askQuestion('👤 Username: ');
      rl.close(); // Close readline interface before asking for password
      password = await askPassword('🔐 Password: ');
    }

    const tokenData = await requestAccessToken(username, password);
    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      console.error('No access token found');
      process.exit(1);
    }

    // Extract the sub value from the JWT token
    const user = await fetchUserAccount(accessToken);
    const offers = await fetchAllOffers({
      accessToken,
      consumerId: user.payload.consumerId,
      cruiseLoyaltyId: user.payload.loyaltyInformation.crownAndAnchorId
    });

    const offersWithDetails = await Promise.all(offers.offers.map(async (offer) => {
      try {
        const details = await fetchOfferDetails({
          accessToken,
          requestBody: {
            returnExcludedSailings: true,
            brand: "R",
            cruiseLoyaltyId: user.payload.loyaltyInformation.crownAndAnchorId,
            offerCode: offer.campaignOffer.offerCode,
            playerOfferId: offer.playerOfferId
          }
        })

        return {
          offer,
          details
        }
      } catch (e) {
        console.error('Error:', e.message)
        process.exit(1)
      }
    }))

    // Save raw offer data to file
    const fs = await import('fs');
    fs.writeFileSync('offers.json', JSON.stringify(offersWithDetails, null, 2));
    console.log('✅ Offer data saved to offers.json');

    // Parse filters from command line arguments
    const filters = parseFilters();
    if (Object.keys(filters).length > 0) {
      console.log('\n🔍 Filters applied:', filters);
    }

    // Compare with bounce-back offers
    console.log('\n🔍 Comparing offers with bounce-back CSV...');
    try {
      const csvFilePath = filters.csvFilePath || './bounce-back.csv';
      const comparisonResults = compareOffersWithBounceBack(offersWithDetails, filters, csvFilePath);
      const report = formatComparisonReport(comparisonResults);
      console.log(report);

      // Determine output format (default to CSV)
      const outputFormat = filters.outputFormat || 'csv';

      if (outputFormat === 'csv') {
        // Save comparison results as CSV
        const csvContent = formatComparisonResultsAsCSV(comparisonResults);
        fs.writeFileSync('comparisonResults.csv', csvContent);
        console.log('\n📊 Detailed comparison results saved to comparisonResults.csv');
      } else {
        // Save detailed comparison results as JSON
        fs.writeFileSync('comparisonResults.json', JSON.stringify(comparisonResults, null, 2));
        console.log('\n📊 Detailed comparison results saved to comparisonResults.json');
      }

    } catch (comparisonError) {
      console.error('❌ Error comparing offers:', comparisonError.message);
      console.log('📋 Raw offer data still available in offers.json');
    }

  } catch (error) {
    console.error('Error:', error.message);
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
