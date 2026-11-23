import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class UsageStatsModule extends NativeModule<{}> {
  hasPermission(): boolean;
  openPermissionSettings(): void;
  /** N+1 epoch-ms boundaries in, N minute totals out. */
  getScreenTimeBuckets(boundaries: number[]): Promise<number[]>;
}

// Optional: returns null on iOS, web and Expo Go, where the module isn't compiled in.
export default requireOptionalNativeModule<UsageStatsModule>('UsageStats');
