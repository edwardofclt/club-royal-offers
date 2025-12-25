'use client';

interface ComparisonResultsProps {
  results: any;
  loading?: boolean;
}

export default function ComparisonResults({ results, loading }: ComparisonResultsProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Comparing offers...</p>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const { stats, overlaps } = results;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-black">Comparison Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total API Sailings</p>
            <p className="text-2xl font-semibold">{stats.totalApiSailings}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Filtered API Sailings</p>
            <p className="text-2xl font-semibold">{stats.filteredApiSailings}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Bounce-Back Offers</p>
            <p className="text-2xl font-semibold">{stats.totalBounceBackOffers}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Overlaps</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.totalOverlaps}</p>
          </div>
        </div>
        {stats.dateRange.earliest && stats.dateRange.latest && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">Date Range</p>
            <p className="text-lg font-semibold">
              {stats.dateRange.earliest} to {stats.dateRange.latest}
            </p>
          </div>
        )}
      </div>

      {overlaps.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-black">Overlaps ({overlaps.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ship</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sail Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Offer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bounce-Back Offer</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {overlaps.map((overlap: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{overlap.shipName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{overlap.sailDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{overlap.departurePort}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium">{overlap.apiOffer.offerCode}</div>
                        <div className="text-gray-500 text-xs">{overlap.apiOffer.offerName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium">{overlap.bounceBackOffer.offerCode}</div>
                        <div className="text-gray-500 text-xs">{overlap.bounceBackOffer.offerType}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 text-center">
          <p className="text-gray-600">No overlaps found between API offers and bounce-back offers.</p>
        </div>
      )}
    </div>
  );
}


