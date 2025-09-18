export class KeyedExternalStore<T> {
  protected subscriptions: Record<string, (listener: () => void) => () => void> = {};
  protected snapshotGetters: Record<string, () => T> = {};
  #snapshots: Record<string, T | undefined> = {};
  protected listeners: Record<string, () => void> = {};

  #getSnapshot: (key: string) => T;
  #areSnapshotsEqual: (prev: T | undefined, next: T) => boolean;

  constructor(
    getSnapshot: (key: string) => T,
    areSnapshotsEqual: (prev: T | undefined, next: T) => boolean = (prev, next) => prev === next
  ) {
    this.#getSnapshot = getSnapshot;
    this.#areSnapshotsEqual = areSnapshotsEqual;
  }

  makeSubscription(key: string): (listener: () => void) => () => void {
    if (key in this.subscriptions) {
      return this.subscriptions[key];
    }

    // console.log("makeSubscription", id);
    const subscribe = (listener: () => void) => {
      this.listeners[key] = listener;

      return () => {
        delete this.listeners[key];
      };
    };

    this.subscriptions[key] = subscribe;

    return subscribe;
  }
  makeSnapshot(key: string): () => T {
    if (key in this.snapshotGetters) {
      return this.snapshotGetters[key];
    }

    // console.log("makeSnapshot", id);
    const getSnapshot = () => {
      const newSnapshot = this.#getSnapshot(key);
      if (!(key in this.#snapshots) || !this.#areSnapshotsEqual(this.#snapshots[key], newSnapshot)) {
        this.#snapshots[key] = newSnapshot;
      }
      return this.#snapshots[key]!;
    };

    this.snapshotGetters[key] = getSnapshot;

    return getSnapshot;
  }

  notify(key: string) {
    if (key in this.listeners) {
      this.listeners[key]();
    }
  }
}

export class ExternalStore<T> {
  #listeners: (() => void)[] = [];
  #snapshot: T | undefined = undefined;

  #retrieveSnapshot: () => T;
  #areSnapshotsEqual: (prev: T | undefined, next: T) => boolean;

  constructor(retrieveSnapshot: () => T, areSnapshotsEqual: (prev: T | undefined, next: T) => boolean = (prev, next) => prev === next) {
    this.#retrieveSnapshot = retrieveSnapshot;
    this.#areSnapshotsEqual = areSnapshotsEqual;
  }

  subscribe: (listener: () => void) => () => void = (listener: () => void) => {
    this.#listeners = [...this.#listeners, listener];
    return () => {
      this.#listeners = this.#listeners.filter(l => l !== listener);
    };
  };
  getSnapshot: () => T = () => {
    const newSnapshot = this.#retrieveSnapshot();
    if (!this.#areSnapshotsEqual(this.#snapshot, newSnapshot)) {
      this.#snapshot = newSnapshot;
      this.notify();
    }
    return this.#snapshot;
  };

  notify = () => {
    for (const listener of this.#listeners) {
      listener();
    }
  };
}
