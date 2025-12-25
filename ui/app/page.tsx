'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import LoginForm from '@/components/LoginForm';
import OffersFiltersWrapper from '@/components/OffersFiltersWrapper';
import { OffersFilters as OffersFiltersType } from '@/components/OffersFilters';
import { dbManager } from '@/lib/indexedDb';
import OffersDisplay from '@/components/OffersDisplay';

export default function Home() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [offers, setOffers] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingOffersAfterLogin, setFetchingOffersAfterLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [isCachedData, setIsCachedData] = useState(false);
  const [offersFilters, setOffersFilters] = useState<OffersFiltersType>({});

  // Helper function to format cache age
  const getCacheAge = (timestamp: number): string => {
    const ageMs = Date.now() - timestamp;
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    if (ageMinutes < 60) {
      return `${ageMinutes} minute${ageMinutes !== 1 ? 's' : ''} ago`;
    } else if (ageHours < 24) {
      return `${ageHours} hour${ageHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${ageDays} day${ageDays !== 1 ? 's' : ''} ago`;
    }
  };

  // Clear cache function
  const clearCache = async () => {
    try {
      await dbManager.deletePrimaryUserData();
      setAccessToken(null);
      setOffers(null);
      setUserInfo(null);
      setCacheTimestamp(null);
      setIsCachedData(false);
      setError(null);
    } catch (error) {
      console.error('Error clearing cache:', error);
      setError('Failed to clear cache');
    }
  };

  // Load cached data from IndexedDB on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        // Load primary user data
        const primaryData = await dbManager.getPrimaryUserData();
        if (primaryData) {
          if (primaryData.accessToken) {
            setAccessToken(primaryData.accessToken);
          }
          if (primaryData.offers && primaryData.userInfo && primaryData.timestamp) {
            setOffers(primaryData.offers);
            setUserInfo(primaryData.userInfo);
            setCacheTimestamp(primaryData.timestamp);
            setIsCachedData(true);
          }
        }
      } catch (error) {
        console.error('Error loading from IndexedDB:', error);
      }
    };

    loadCachedData();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      const token = data.access_token;
      setAccessToken(token);

      // Cache access token (preserve existing offers and timestamp if available)
      try {
        const cachedData = await dbManager.getPrimaryUserData();
        if (cachedData && cachedData.offers && cachedData.userInfo) {
          // Update access token but keep existing offers and timestamp
          await dbManager.savePrimaryUserData({
            ...cachedData,
            accessToken: token,
            timestamp: cachedData.timestamp, // Preserve existing timestamp
          });
        } else {
          // No cached data or no offers, just save the token
          await dbManager.savePrimaryUserData({
            accessToken: token,
          });
        }
      } catch (error) {
        console.error('Error saving access token to IndexedDB:', error);
      }

      // Automatically fetch offers after successful login
      setFetchingOffersAfterLogin(true);
      try {
        const offersResponse = await fetch('/api/offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token }),
        });

        if (!offersResponse.ok) {
          const offersData = await offersResponse.json();
          throw new Error(offersData.error || 'Failed to fetch offers');
        }

        const offersData = await offersResponse.json();
        setOffers(offersData.offers);
        setUserInfo(offersData.user);
        setIsCachedData(false);
        setError(null);

        // Cache offers and user info in IndexedDB
        try {
          const cachedData = await dbManager.getPrimaryUserData();
          const timestamp = Date.now();
          await dbManager.savePrimaryUserData({
            accessToken: token,
            offers: offersData.offers,
            userInfo: offersData.user,
            timestamp, // Always update timestamp when saving new offers
          });
          setCacheTimestamp(timestamp);
        } catch (error) {
          console.error('Error saving to IndexedDB:', error);
        }
      } catch (offersErr: any) {
        // Log the error but don't throw - login was successful
        console.error('Error fetching offers after login:', offersErr);
        setError(`Login successful, but failed to fetch offers: ${offersErr.message}`);
      } finally {
        setFetchingOffersAfterLogin(false);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleFetchOffers = async () => {
    if (!accessToken) {
      setError('Please login first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch offers');
      }

      const data = await response.json();
      setOffers(data.offers);
      setUserInfo(data.user);
      setIsCachedData(false);
      setError(null);

      // Cache offers and user info in IndexedDB
      try {
        const cachedData = await dbManager.getPrimaryUserData();
        const timestamp = Date.now();
        await dbManager.savePrimaryUserData({
          accessToken: cachedData?.accessToken || accessToken || undefined,
          offers: data.offers,
          userInfo: data.user,
          timestamp, // Always update timestamp when saving new offers
        });
        setCacheTimestamp(timestamp);
      } catch (error) {
        console.error('Error saving to IndexedDB:', error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {cacheTimestamp && (
          <div className="mb-6 flex items-center justify-end gap-4">
            <div className="text-sm text-gray-600">
              <span className="text-green-600">●</span> Cached {getCacheAge(cacheTimestamp)}
            </div>
            <button
              onClick={clearCache}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              title="Clear all cached data"
            >
              Logout & Clear Cache
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {!accessToken && (
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-black">Login</h2>
              <p className="mb-4 text-gray-600 text-sm">
                Enter your credentials below. We use them only to securely retrieve your casino offers &mdash; nothing else.
              </p>
              <LoginForm onLogin={handleLogin} loading={loading} />
            </div>
          )}

          {accessToken && (
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Fetch Offers</h2>
                {offers && cacheTimestamp && (
                  <span className="text-sm text-gray-500">
                    Last fetched: {new Date(cacheTimestamp).toLocaleString()}
                  </span>
                )}
              </div>
              {fetchingOffersAfterLogin ? (
                <div className="flex items-center gap-2 py-4">
                  <svg
                    className="animate-spin h-3 w-3 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    style={{ maxWidth: '20px', maxHeight: '20px' }}
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="50"
                      strokeDashoffset="25"
                      fill="none"
                    />
                  </svg>
                  <p className="text-gray-600 text-sm">Loading your offers...</p>
                </div>
              ) : (
                <>
                  {loading ? (
                    <div className="flex items-center gap-2 py-4">
                      <svg
                        className="animate-spin h-3 w-3 text-blue-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        style={{ maxWidth: '20px', maxHeight: '20px' }}
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray="50"
                          strokeDashoffset="25"
                          fill="none"
                        />
                      </svg>
                      <p className="text-gray-600 text-sm">Loading your offers...</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleFetchOffers}
                        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                      >
                        {offers ? 'Refresh Offers' : 'Fetch Offers'}
                      </button>
                    </div>
                  )}
                  {offers && (
                    <div className="mt-4">
                      <p className="text-green-600 font-semibold">
                        ✓ {offers.length} offers {isCachedData ? '(loaded from cache)' : '(freshly fetched)'}
                      </p>
                      {isCachedData && (
                        <p className="text-sm text-gray-500 mt-1">
                          Click "Refresh Offers" to fetch the latest data from the API
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {offers && offers.length > 0 && (
            <>
              <OffersFiltersWrapper
                offers={offers}
                filters={offersFilters}
                onFilterChange={setOffersFilters}
                userInfo={userInfo}
                element={<OffersDisplay />}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
