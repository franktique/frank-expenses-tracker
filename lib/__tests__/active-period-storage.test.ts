import { ActivePeriodStorage } from '../active-period-storage';
import { Period } from '../../types/funds';

// sessionStorage is already mocked in jest.setup.js

describe('ActivePeriodStorage', () => {
  const mockPeriod: Period = {
    id: 'test-period-id',
    name: 'Test Period',
    month: 1,
    year: 2024,
    is_open: true,
    isOpen: true,
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  describe('saveActivePeriod and loadActivePeriod', () => {
    it('should save and load active period correctly', () => {
      ActivePeriodStorage.saveActivePeriod(mockPeriod);
      const loaded = ActivePeriodStorage.loadActivePeriod();

      expect(loaded).toEqual(mockPeriod);
    });

    it('should return null when no period is cached', () => {
      const loaded = ActivePeriodStorage.loadActivePeriod();
      expect(loaded).toBeNull();
    });

    it('should handle corrupted cache data', () => {
      window.sessionStorage.setItem(
        'budget_tracker_active_period',
        'invalid json'
      );
      const loaded = ActivePeriodStorage.loadActivePeriod();

      expect(loaded).toBeNull();
      // Should clear corrupted cache
      expect(
        window.sessionStorage.getItem('budget_tracker_active_period')
      ).toBeNull();
    });
  });

  describe('isActivePeriodCached', () => {
    it('should return true when valid period is cached', () => {
      ActivePeriodStorage.saveActivePeriod(mockPeriod);
      expect(ActivePeriodStorage.isActivePeriodCached()).toBe(true);
    });

    it('should return false when no period is cached', () => {
      expect(ActivePeriodStorage.isActivePeriodCached()).toBe(false);
    });

    it('should return false for invalid cache data', () => {
      window.sessionStorage.setItem(
        'budget_tracker_active_period',
        JSON.stringify({
          period: { invalid: 'data' },
          timestamp: Date.now(),
          version: '1.0.0',
        })
      );

      expect(ActivePeriodStorage.isActivePeriodCached()).toBe(false);
    });
  });

  describe('clearActivePeriod', () => {
    it('should clear cached period', () => {
      ActivePeriodStorage.saveActivePeriod(mockPeriod);
      expect(ActivePeriodStorage.isActivePeriodCached()).toBe(true);

      ActivePeriodStorage.clearActivePeriod();
      expect(ActivePeriodStorage.isActivePeriodCached()).toBe(false);
    });
  });

  describe('getCacheMetadata', () => {
    it('should return metadata for valid cache', () => {
      ActivePeriodStorage.saveActivePeriod(mockPeriod);
      const metadata = ActivePeriodStorage.getCacheMetadata();

      expect(metadata).toBeTruthy();
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.isValid).toBe(true);
      expect(typeof metadata?.timestamp).toBe('number');
    });

    it('should return null when no cache exists', () => {
      const metadata = ActivePeriodStorage.getCacheMetadata();
      expect(metadata).toBeNull();
    });
  });

  describe('cache expiry', () => {
    it('should invalidate expired cache', () => {
      // Mock an expired cache entry
      const expiredData = {
        period: mockPeriod,
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        version: '1.0.0',
      };

      window.sessionStorage.setItem(
        'budget_tracker_active_period',
        JSON.stringify(expiredData)
      );

      const loaded = ActivePeriodStorage.loadActivePeriod();
      expect(loaded).toBeNull();
      expect(ActivePeriodStorage.isActivePeriodCached()).toBe(false);
    });
  });

  describe('version compatibility', () => {
    it('should invalidate cache with different version', () => {
      const oldVersionData = {
        period: mockPeriod,
        timestamp: Date.now(),
        version: '0.9.0',
      };

      window.sessionStorage.setItem(
        'budget_tracker_active_period',
        JSON.stringify(oldVersionData)
      );

      const loaded = ActivePeriodStorage.loadActivePeriod();
      expect(loaded).toBeNull();
      expect(ActivePeriodStorage.isActivePeriodCached()).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    describe('recoverFromCorruptedCache', () => {
      it('should recover from corrupted JSON', () => {
        window.sessionStorage.setItem(
          'budget_tracker_active_period',
          'invalid json {'
        );

        const recovery = ActivePeriodStorage.recoverFromCorruptedCache();

        expect(recovery.recovered).toBe(true);
        expect(recovery.action).toBe('cleared_corrupted_json');
        expect(
          window.sessionStorage.getItem('budget_tracker_active_period')
        ).toBeNull();
      });

      it('should reconstruct valid cache from partial data', () => {
        const partialData = {
          period: {
            id: 'test-id',
            name: 'Test Period',
            month: 1,
            year: 2024,
            is_open: true,
          },
          // Missing timestamp and version
        };

        window.sessionStorage.setItem(
          'budget_tracker_active_period',
          JSON.stringify(partialData)
        );

        const recovery = ActivePeriodStorage.recoverFromCorruptedCache();

        expect(recovery.recovered).toBe(true);
        expect(recovery.action).toBe('reconstructed_cache');

        // Should be able to load the reconstructed data
        const loaded = ActivePeriodStorage.loadActivePeriod();
        expect(loaded).toBeTruthy();
        expect(loaded?.id).toBe('test-id');
        expect(loaded?.name).toBe('Test Period');
      });

      it('should clear invalid data that cannot be recovered', () => {
        const invalidData = {
          period: {
            // Missing required fields
            name: 'Test',
          },
          timestamp: Date.now(),
          version: '1.0.0',
        };

        window.sessionStorage.setItem(
          'budget_tracker_active_period',
          JSON.stringify(invalidData)
        );

        const recovery = ActivePeriodStorage.recoverFromCorruptedCache();

        expect(recovery.recovered).toBe(true);
        expect(recovery.action).toBe('cleared_invalid_data');
        expect(
          window.sessionStorage.getItem('budget_tracker_active_period')
        ).toBeNull();
      });

      it('should handle no cache gracefully', () => {
        const recovery = ActivePeriodStorage.recoverFromCorruptedCache();

        expect(recovery.recovered).toBe(true);
        expect(recovery.action).toBe('no_cache');
      });
    });

    describe('performCacheHealthCheck', () => {
      it('should report healthy cache', () => {
        ActivePeriodStorage.saveActivePeriod(mockPeriod);

        const health = ActivePeriodStorage.performCacheHealthCheck();

        expect(health.healthy).toBe(true);
        expect(health.issues).toHaveLength(0);
        expect(health.repaired).toBe(false);
        expect(health.actions).toContain('Cache is healthy');
      });

      it('should detect and repair corrupted JSON', () => {
        window.sessionStorage.setItem(
          'budget_tracker_active_period',
          'invalid json'
        );

        const health = ActivePeriodStorage.performCacheHealthCheck();

        expect(health.healthy).toBe(true);
        expect(health.issues).toContain('Cache contains invalid JSON');
        expect(health.repaired).toBe(true);
        expect(health.actions).toContain('Cleared corrupted JSON cache');
      });

      it('should detect expired cache', () => {
        const expiredData = {
          period: mockPeriod,
          timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
          version: '1.0.0',
        };

        window.sessionStorage.setItem(
          'budget_tracker_active_period',
          JSON.stringify(expiredData)
        );

        const health = ActivePeriodStorage.performCacheHealthCheck();

        expect(health.healthy).toBe(true);
        expect(health.issues.some((issue) => issue.includes('expired'))).toBe(
          true
        );
        expect(health.repaired).toBe(true);
        expect(health.actions).toContain('Cleared expired cache');
      });

      it('should detect version mismatch', () => {
        const oldVersionData = {
          period: mockPeriod,
          timestamp: Date.now(),
          version: '0.9.0',
        };

        window.sessionStorage.setItem(
          'budget_tracker_active_period',
          JSON.stringify(oldVersionData)
        );

        const health = ActivePeriodStorage.performCacheHealthCheck();

        expect(health.healthy).toBe(true);
        expect(
          health.issues.some((issue) => issue.includes('version mismatch'))
        ).toBe(true);
        expect(health.repaired).toBe(true);
        expect(health.actions).toContain(
          'Cleared cache due to version mismatch'
        );
      });
    });

    describe('withFallback', () => {
      it('should use session storage when available', () => {
        const storage = ActivePeriodStorage.withFallback();

        expect(storage.usingFallback).toBe(false);

        storage.saveActivePeriod(mockPeriod);
        const loaded = storage.loadActivePeriod();

        expect(loaded).toEqual(mockPeriod);
      });

      it('should use memory fallback when session storage is unavailable', () => {
        // Mock session storage as unavailable
        const originalSessionStorage = window.sessionStorage;
        delete (window as any).sessionStorage;

        const storage = ActivePeriodStorage.withFallback();

        expect(storage.usingFallback).toBe(true);

        storage.saveActivePeriod(mockPeriod);
        const loaded = storage.loadActivePeriod();

        expect(loaded).toEqual(mockPeriod);

        // Restore session storage
        (window as any).sessionStorage = originalSessionStorage;
      });

      it('should handle memory fallback operations correctly', () => {
        // Mock session storage as unavailable
        const originalSessionStorage = window.sessionStorage;
        delete (window as any).sessionStorage;

        const storage = ActivePeriodStorage.withFallback();

        expect(storage.isActivePeriodCached()).toBe(false);

        storage.saveActivePeriod(mockPeriod);
        expect(storage.isActivePeriodCached()).toBe(true);

        storage.clearActivePeriod();
        expect(storage.isActivePeriodCached()).toBe(false);

        // Restore session storage
        (window as any).sessionStorage = originalSessionStorage;
      });
    });
  });
});
