# Filter Usage Guide

This guide explains how to use the filtering functionality in the Royal Casino Offers comparison tool.

## Overview

The filtering system allows you to narrow down your search to specific ships, date ranges, and departure ports when comparing API offers with bounce-back offers. This helps you focus on the most relevant cruise opportunities.

## Filter Options

### Ship Names (`--ships`)
Filter by specific ship names (case-insensitive, partial matching supported).

```bash
# Single ship
node index.js --ships "Serenade"

# Multiple ships
node index.js --ships "Serenade,Enchantment,Utopia"
```

### Date Range (`--start-date`, `--end-date`)
Filter sailings within a specific date range.

```bash
# From a specific date onwards
node index.js --start-date "2025-10-01"

# Up to a specific date
node index.js --end-date "2025-12-31"

# Within a date range
node index.js --start-date "2025-09-01" --end-date "2025-11-30"
```

### Departure Ports (`--ports`)
Filter by departure ports (case-insensitive, partial matching supported).

```bash
# Single port
node index.js --ports "Miami"

# Multiple ports
node index.js --ports "Miami,Fort Lauderdale,Port Canaveral"
```

### Minimum Days (`--min-days`)
Filter sailings by minimum number of nights.

```bash
# Minimum 5 nights
node index.js --min-days 5

# Minimum 7 nights (week-long cruises)
node index.js --min-days 7

# Minimum 10 nights (extended cruises)
node index.js --min-days 10
```

## Usage Examples

### Main Script (index.js)

```bash
# Show help
node index.js --help

# Filter by specific ships
node index.js --ships "Serenade,Enchantment"

# Filter by date range
node index.js --start-date "2025-10-01" --end-date "2025-12-31"

# Filter by departure ports
node index.js --ports "Miami,Fort Lauderdale"

# Filter by minimum days
node index.js --min-days 7 --start-date "2025-06-01"

# Combined filters
node index.js --ships "Utopia" --ports "Port Canaveral" --start-date "2025-09-01" --end-date "2025-11-30"

# Filter by ship and minimum days
node index.js --ships "Serenade" --min-days 5 --ports "Miami"
```

### Comparison Script (compareOffers.js)

```bash
# Show help
node compareOffers.js --help

# Filter existing offer data
node compareOffers.js --ships "Serenade"

# Use custom file paths with filters
node compareOffers.js my-offers.json my-bounce-back.csv --start-date "2025-10-01"

# Filter by minimum days
node compareOffers.js --min-days 7 --start-date "2025-06-01"

# Multiple filters
node compareOffers.js --ships "Enchantment,Utopia" --ports "Miami,Port Canaveral" --end-date "2025-12-31"

# Filter by ship and minimum days
node compareOffers.js --ships "Serenade" --min-days 5 --ports "Miami"
```

## Programmatic Usage

You can also use filters programmatically in your own code:

```javascript
import { compareOffersWithBounceBack } from './offerComparison.js';

const filters = {
    ships: ["Serenade", "Enchantment"],
    ports: ["Miami", "Fort Lauderdale"],
    startDate: "2025-10-01",
    endDate: "2025-12-31",
    minDays: 5
};

const results = compareOffersWithBounceBack(offerData, filters);
```

## Filter Behavior

- **Case Insensitive**: All text filters (ships, ports) are case-insensitive
- **Partial Matching**: Ship and port names support partial matching
- **Combined Logic**: Multiple filters use AND logic (all conditions must be met)
- **Empty Filters**: If no filters are provided, all data is included
- **Minimum Days**: Filters cruises with at least the specified number of nights (extracted from itinerary descriptions)

## Example Results

When filters are applied, the comparison report will show:

```
=== OFFER COMPARISON REPORT ===

STATISTICS:
- Total API Sailings: 150
- Filtered API Sailings: 25
- Total Bounce-Back Offers: 924
- Filtered Bounce-Back Offers: 45
- Total Overlaps Found: 8
- Unique Ships with Overlaps: 3
- Date Range: 2025-10-15 to 2025-11-20

FILTERS APPLIED:
- Ships: Serenade, Enchantment
- Ports: Miami, Fort Lauderdale
- Start Date: 2025-10-01
- End Date: 2025-12-31
- Minimum Days: 5
```

## Tips

1. **Use partial names**: You can use partial ship names like "Serenade" instead of "Serenade Of The Seas"
2. **Port variations**: Try different port name variations like "Miami" or "Miami, Florida"
3. **Date format**: Use YYYY-MM-DD format for dates
4. **Minimum days**: The system extracts night counts from itinerary descriptions like "5 Night Western Caribbean Cruise"
5. **Test without filters first**: Run without filters to see all available data, then apply filters to narrow down

## Troubleshooting

- **No results**: Try broader filters or check if your filter criteria match the data
- **Date format errors**: Ensure dates are in YYYY-MM-DD format
- **File not found**: Make sure offers.json exists (run the main script first)
- **Help**: Use `--help` flag to see usage information
