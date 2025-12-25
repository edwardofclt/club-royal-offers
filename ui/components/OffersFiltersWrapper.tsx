'use client';

import { cloneElement, JSX, useMemo } from 'react';
import { extractSailingsFromOffer } from '@/lib/comparison';
import OffersFilters from './OffersFilters';
import OffersDisplay, { OffersDisplayProps } from './OffersDisplay';
import { OffersFilters as OffersFiltersType } from './OffersFilters';

interface OffersFiltersWrapperProps {
    offers: any[];
    filters: OffersFiltersType;
    onFilterChange: (filters: OffersFiltersType) => void;
    userInfo?: any;
    element: React.ReactElement<OffersDisplayProps>;
}

export default function OffersFiltersWrapper({ offers, filters, onFilterChange, userInfo, element }: OffersFiltersWrapperProps) {
    // Extract unique ships and ports from all sailings
    const { uniqueShips, uniquePorts } = useMemo(() => {
        const allSailings = offers.flatMap((offer: any) => extractSailingsFromOffer(offer));
        const ships = Array.from(new Set(allSailings.map((s: any) => s.shipName).filter(Boolean))).sort() as string[];
        const ports = Array.from(new Set(allSailings.map((s: any) => s.departurePort).filter(Boolean))).sort() as string[];
        return { uniqueShips: ships, uniquePorts: ports };
    }, [offers]);

    return (
        <>
            <OffersFilters
                filters={filters}
                onFilterChange={onFilterChange}
                availableShips={uniqueShips}
                availablePorts={uniquePorts}
            />
            {cloneElement(element, { offers, user: userInfo, filters })}
        </>
    );
}

