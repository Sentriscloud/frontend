export enum FetchStatus {
  Idle = "idle",
  Fetching = "fetching",
  Fetched = "fetched",
  FetchFailed = "fetchFailed",
}

export interface FetchState<T> {
  status: FetchStatus;
  data: T | null;
  error: Error | null;
  lastUpdated: number | null;
}
