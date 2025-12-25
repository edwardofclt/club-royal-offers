# Royal Casino Offers - Next.js Application

This Next.js application provides a web interface for comparing Royal Caribbean casino offers. It integrates the functionality from the scripts directory into a modern web application.

## Features

- **Authentication**: Login with Royal Caribbean credentials
- **Fetch Offers**: Retrieve casino offers from the Royal Caribbean API
- **Compare with Bounce-Back**: Compare API offers with bounce-back CSV data
- **Compare Users**: Compare offers between two users
- **Filtering**: Filter offers by ships, ports, dates, and minimum days

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Run the development server:
```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Login & Fetch Offers

1. Navigate to the "Login & Fetch Offers" tab
2. Enter your Royal Caribbean username and password
3. Click "Login" to authenticate
4. Click "Fetch Offers" to retrieve your casino offers
5. The offers will be stored in the application state

### 2. Compare with Bounce-Back

1. After fetching offers, navigate to the "Compare with Bounce-Back" tab
2. (Optional) Apply filters:
   - Ships: Comma-separated list of ship names
   - Ports: Comma-separated list of departure ports
   - Start Date / End Date: Date range filter
   - Minimum Days: Minimum number of nights
3. Upload a bounce-back CSV file
4. Click "Compare Offers" to see the comparison results
5. View statistics and overlapping offers

### 3. Compare Users

1. Navigate to the "Compare Users" tab
2. Upload User 1 offers JSON file (from the scripts directory)
3. Upload User 2 offers JSON file (from the scripts directory)
4. Click "Compare Users" to see the comparison
5. View common offers, unique offers, and matching sailings

## Project Structure

```
nextjs/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoint
│   │   ├── offers/       # Fetch offers endpoint
│   │   ├── compare/      # Compare with bounce-back endpoint
│   │   └── compare-users/# Compare users endpoint
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page
├── components/           # React components
│   ├── LoginForm.tsx
│   ├── ComparisonFilters.tsx
│   ├── ComparisonResults.tsx
│   └── UserComparisonResults.tsx
└── lib/                  # Library functions
    ├── auth.ts           # Authentication
    ├── user.ts           # User account fetching
    ├── offers.ts         # Offer fetching
    ├── comparison.ts     # Comparison logic
    └── util.ts           # Utility functions
```

## API Routes

### POST /api/auth
Authenticate with Royal Caribbean credentials.

**Request:**
```json
{
  "username": "your-username",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  ...
}
```

### POST /api/offers
Fetch casino offers for authenticated user.

**Request:**
```json
{
  "accessToken": "your-access-token"
}
```

**Response:**
```json
{
  "user": {...},
  "offers": [...]
}
```

### POST /api/compare
Compare API offers with bounce-back CSV.

**Request:**
```json
{
  "apiOffers": [...],
  "filters": {
    "ships": ["Serenade"],
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "ports": ["Miami"],
    "minDays": 5
  },
  "csvContent": "CSV file content as string",
  "format": "json"
}
```

### POST /api/compare-users
Compare offers between two users.

**Request:**
```json
{
  "user1Offers": [...],
  "user2Offers": [...]
}
```

## Integration with Scripts

This application integrates the functionality from the `scripts/` directory:

- `auth.js` → `lib/auth.ts`
- `user.js` → `lib/user.ts`
- `fetchAllOffers.js` → `lib/offers.ts`
- `fetchOfferDetails.js` → `lib/offers.ts`
- `offerComparison.js` → `lib/comparison.ts`
- `compare-users.js` → `lib/comparison.ts` (user comparison functions)
- `util.js` → `lib/util.ts`

The scripts have been converted to TypeScript and adapted for use in a Next.js application with API routes and React components.

## Filtering

Filters can be applied to narrow down comparison results:

- **Ships**: Case-insensitive, supports partial matching
- **Ports**: Case-insensitive, supports partial matching
- **Date Range**: Filter sailings within a specific date range
- **Minimum Days**: Filter sailings with at least N nights

Multiple filters use AND logic (all conditions must be met).

## Build

```bash
pnpm build
```

## Production

```bash
pnpm start
```

## License

ISC
