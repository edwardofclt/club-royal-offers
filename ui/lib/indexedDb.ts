const DB_NAME = 'royalCasinoOffers';
const DB_VERSION = 1;

interface CacheData {
    accessToken?: string;
    offers?: any[];
    userInfo?: any;
    timestamp?: number;
}

interface User2CacheData {
    accessToken?: string;
    offers?: any[];
    userInfo?: any;
    timestamp?: number;
}

class IndexedDBManager {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    private async init(): Promise<void> {
        if (this.db) {
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('IndexedDB is only available in browser'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('primaryUser')) {
                    db.createObjectStore('primaryUser', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('user2')) {
                    db.createObjectStore('user2', { keyPath: 'id' });
                }
            };
        });

        return this.initPromise;
    }

    async getPrimaryUserData(): Promise<CacheData | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['primaryUser'], 'readonly');
            const store = transaction.objectStore('primaryUser');
            const request = store.get('data');

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const data = request.result;
                if (!data) {
                    resolve(null);
                    return;
                }

                // Check if cache is expired (24 hours)
                // Timestamp should always be present, but handle gracefully if not
                if (!data.timestamp) {
                    // No timestamp, treat as invalid
                    this.deletePrimaryUserData().then(() => resolve(null));
                    return;
                }

                const cacheAge = Date.now() - data.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours

                if (cacheAge >= maxAge) {
                    // Cache expired, delete it
                    this.deletePrimaryUserData().then(() => resolve(null));
                } else {
                    resolve(data as CacheData);
                }
            };
        });
    }

    async savePrimaryUserData(data: CacheData): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['primaryUser'], 'readwrite');
            const store = transaction.objectStore('primaryUser');
            // Use provided timestamp, or current time if not provided
            const timestamp = data.timestamp || Date.now();
            const request = store.put({ id: 'data', ...data, timestamp });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async deletePrimaryUserData(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['primaryUser'], 'readwrite');
            const store = transaction.objectStore('primaryUser');
            const request = store.delete('data');

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async getUser2Data(): Promise<User2CacheData | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['user2'], 'readonly');
            const store = transaction.objectStore('user2');
            const request = store.get('data');

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const data = request.result;
                if (!data) {
                    resolve(null);
                    return;
                }

                // Check if cache is expired (24 hours)
                // Timestamp should always be present, but handle gracefully if not
                if (!data.timestamp) {
                    // No timestamp, treat as invalid
                    this.deleteUser2Data().then(() => resolve(null));
                    return;
                }

                const cacheAge = Date.now() - data.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours

                if (cacheAge >= maxAge) {
                    // Cache expired, delete it
                    this.deleteUser2Data().then(() => resolve(null));
                } else {
                    resolve(data as User2CacheData);
                }
            };
        });
    }

    async saveUser2Data(data: User2CacheData): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['user2'], 'readwrite');
            const store = transaction.objectStore('user2');
            // Use provided timestamp, or current time if not provided
            const timestamp = data.timestamp || Date.now();
            const request = store.put({ id: 'data', ...data, timestamp });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async deleteUser2Data(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['user2'], 'readwrite');
            const store = transaction.objectStore('user2');
            const request = store.delete('data');

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async clearAll(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return Promise.all([
            this.deletePrimaryUserData(),
            this.deleteUser2Data(),
        ]).then(() => { });
    }
}

// Export singleton instance
export const dbManager = new IndexedDBManager();

