'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import LoginForm from '@/components/LoginForm';
import UserComparisonResults from '@/components/UserComparisonResults';
import { dbManager } from '@/lib/indexedDb';

export default function CompareUsersPage() {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [offers, setOffers] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [comparisonResults, setComparisonResults] = useState<any>(null);
    const [user1Offers, setUser1Offers] = useState<any[] | null>(null);
    const [user2Offers, setUser2Offers] = useState<any[] | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [user2AccessToken, setUser2AccessToken] = useState<string | null>(null);
    const [user2Info, setUser2Info] = useState<any>(null);
    const [user2Loading, setUser2Loading] = useState(false);
    const [user2CacheTimestamp, setUser2CacheTimestamp] = useState<number | null>(null);
    const [isUser2CachedData, setIsUser2CachedData] = useState(false);
    const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
    const [isCachedData, setIsCachedData] = useState(false);

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

    // Clear User 2 cache function
    const clearUser2Cache = async () => {
        try {
            await dbManager.deleteUser2Data();
            setUser2AccessToken(null);
            setUser2Offers(null);
            setUser2Info(null);
            setUser2CacheTimestamp(null);
            setIsUser2CachedData(false);
            setError(null);
        } catch (error) {
            console.error('Error clearing User 2 cache:', error);
            setError('Failed to clear User 2 cache');
        }
    };

    // Load cached data from IndexedDB on mount
    useEffect(() => {
        const loadCachedData = async () => {
            try {
                // Load primary user data (User 1)
                const primaryData = await dbManager.getPrimaryUserData();
                if (primaryData) {
                    if (primaryData.offers && primaryData.userInfo && primaryData.timestamp) {
                        setOffers(primaryData.offers);
                        setUserInfo(primaryData.userInfo);
                        setUser1Offers(primaryData.offers);
                        setCacheTimestamp(primaryData.timestamp);
                        setIsCachedData(true);
                    }
                }

                // Load User 2 data
                const user2Data = await dbManager.getUser2Data();
                if (user2Data) {
                    if (user2Data.accessToken) {
                        setUser2AccessToken(user2Data.accessToken);
                    }
                    if (user2Data.offers && user2Data.userInfo && user2Data.timestamp) {
                        setUser2Offers(user2Data.offers);
                        setUser2Info(user2Data.userInfo);
                        setUser2CacheTimestamp(user2Data.timestamp);
                        setIsUser2CachedData(true);
                    }
                }
            } catch (error) {
                console.error('Error loading from IndexedDB:', error);
            }
        };

        loadCachedData();
    }, []);

    // Handle User 2 login
    const handleUser2Login = async (username: string, password: string) => {
        setUser2Loading(true);
        setError(null);
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'User 2 login failed');
            }

            const data = await response.json();
            setUser2AccessToken(data.access_token);

            // Cache User 2 access token (preserve existing offers and timestamp if available)
            try {
                const cachedData = await dbManager.getUser2Data();
                if (cachedData && cachedData.offers && cachedData.userInfo) {
                    // Update access token but keep existing offers and timestamp
                    await dbManager.saveUser2Data({
                        ...cachedData,
                        accessToken: data.access_token,
                        timestamp: cachedData.timestamp, // Preserve existing timestamp
                    });
                } else {
                    // No cached data or no offers, just save the token
                    await dbManager.saveUser2Data({
                        accessToken: data.access_token,
                    });
                }
            } catch (error) {
                console.error('Error saving User 2 token to IndexedDB:', error);
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setUser2Loading(false);
        }
    };

    // Handle fetching User 2 offers
    const handleFetchUser2Offers = async () => {
        if (!user2AccessToken) {
            setError('Please login as User 2 first');
            return;
        }

        setUser2Loading(true);
        setError(null);
        try {
            const response = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: user2AccessToken }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch User 2 offers');
            }

            const data = await response.json();
            setUser2Offers(data.offers);
            setUser2Info(data.user);
            setIsUser2CachedData(false);
            setError(null);

            // Cache User 2 offers and user info in IndexedDB
            try {
                const cachedData = await dbManager.getUser2Data();
                const timestamp = Date.now();
                await dbManager.saveUser2Data({
                    accessToken: cachedData?.accessToken || user2AccessToken || undefined,
                    offers: data.offers,
                    userInfo: data.user,
                    timestamp, // Always update timestamp when saving new offers
                });
                setUser2CacheTimestamp(timestamp);
            } catch (error) {
                console.error('Error saving User 2 data to IndexedDB:', error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUser2Loading(false);
        }
    };

    // Handle comparing users
    const handleCompareUsers = async () => {
        // Use primary user's offers as User 1
        const primaryUserOffers = offers;

        if (!primaryUserOffers || primaryUserOffers.length === 0) {
            setError('Please fetch offers for the primary user first on the "Fetch User Offers" page');
            return;
        }

        if (!user2Offers || user2Offers.length === 0) {
            setError('Please fetch offers for User 2');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/compare-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user1Offers: primaryUserOffers,
                    user2Offers: user2Offers,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'User comparison failed');
            }

            const data = await response.json();
            setComparisonResults(data);
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

                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* User 1 (Primary User) Status */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4 text-black">User 1 (Primary User)</h2>
                        {offers && offers.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-green-600 font-semibold">
                                    ✓ Primary user offers available ({offers.length} offers)
                                </p>
                                {userInfo && (
                                    <div className="text-sm text-gray-600">
                                        <p>Consumer ID: {userInfo.payload?.consumerId || 'N/A'}</p>
                                        <p>Crown & Anchor ID: {userInfo.payload?.loyaltyInformation?.crownAndAnchorId || 'N/A'}</p>
                                    </div>
                                )}
                                {cacheTimestamp && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        {isCachedData ? 'Cached' : 'Fetched'}: {getCacheAge(cacheTimestamp)} ({new Date(cacheTimestamp).toLocaleString()})
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    These are the offers from the user logged in on the <Link href="/" className="text-blue-600 hover:underline">"Fetch User Offers"</Link> page.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-yellow-600 font-semibold">
                                    ⚠ No primary user offers found
                                </p>
                                <p className="text-sm text-gray-600">
                                    Please <Link href="/" className="text-blue-600 hover:underline">login and fetch offers</Link> on the "Fetch User Offers" page first.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* User 2 (Secondary User) Login and Fetch */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4 text-black">User 2 (Secondary User)</h2>
                        {!user2AccessToken ? (
                            <div>
                                <p className="text-sm text-gray-600 mb-4">
                                    Login with the second user's credentials to compare offers
                                </p>
                                <p className="mb-4 text-gray-600 text-sm">
                                    Enter your credentials below. We use them only to securely retrieve your casino offers &mdash; nothing else.
                                </p>
                                <LoginForm onLogin={handleUser2Login} loading={user2Loading} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-green-50 border border-green-200 rounded">
                                    <p className="text-green-700 font-semibold">✓ User 2 logged in</p>
                                    {user2Info && (
                                        <div className="text-sm text-gray-600 mt-2">
                                            <p>Consumer ID: {user2Info.payload?.consumerId || 'N/A'}</p>
                                            <p>Crown & Anchor ID: {user2Info.payload?.loyaltyInformation?.crownAndAnchorId || 'N/A'}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleFetchUser2Offers}
                                        disabled={user2Loading}
                                        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {user2Loading ? 'Fetching...' : user2Offers ? 'Refresh User 2 Offers' : 'Fetch User 2 Offers'}
                                    </button>
                                    {user2Offers && (
                                        <button
                                            onClick={clearUser2Cache}
                                            className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                                        >
                                            Clear User 2 Cache
                                        </button>
                                    )}
                                </div>
                                {user2Offers && user2Offers.length > 0 && (
                                    <div>
                                        <p className="text-green-600 font-semibold">
                                            ✓ User 2 offers loaded ({user2Offers.length} offers) {isUser2CachedData ? '(from cache)' : '(freshly fetched)'}
                                        </p>
                                        {user2CacheTimestamp && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {isUser2CachedData ? 'Cached' : 'Fetched'}: {getCacheAge(user2CacheTimestamp)} ({new Date(user2CacheTimestamp).toLocaleString()})
                                            </p>
                                        )}
                                        {isUser2CachedData && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Click "Refresh User 2 Offers" to fetch the latest data from the API
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Compare Button */}
                    {offers && offers.length > 0 && user2Offers && user2Offers.length > 0 && (
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                            <button
                                onClick={handleCompareUsers}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-lg font-semibold"
                            >
                                {loading ? 'Comparing...' : 'Compare Users'}
                            </button>
                        </div>
                    )}

                    {/* Comparison Results */}
                    {comparisonResults && (
                        <>
                            <UserComparisonResults results={comparisonResults} loading={loading} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

