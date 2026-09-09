/**
 * SIH26122 Sync Manager
 * Automatically flushes locally queued offline reports to POST /ingestion/report
 * using window 'online', Background Sync API (where available), and initial app load.
 */

import { api } from '../../api/client';
import { getQueuedReports, removeQueuedReport } from './queue';

let isFlushing = false;
type SyncCallback = () => void;
const syncListeners: Set<SyncCallback> = new Set();

export function onSyncCompleted(cb: SyncCallback): () => void {
  syncListeners.add(cb);
  return () => syncListeners.delete(cb);
}

function notifySyncCompleted() {
  syncListeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error('Error in sync listener:', err);
    }
  });
}

/**
 * Reads all queued reports, attempts POST /ingestion/report for each in oldest-first order.
 * On success, removes that entry from the queue. On failure, stops the pass and leaves remaining items.
 */
export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  if (isFlushing) return { synced: 0, remaining: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, remaining: 0 };
  }

  isFlushing = true;
  let syncedCount = 0;

  try {
    const queued = await getQueuedReports();
    if (queued.length === 0) {
      isFlushing = false;
      return { synced: 0, remaining: 0 };
    }

    for (const item of queued) {
      try {
        let fileToUpload: File | null = null;
        if (item.fileAttachment) {
          const blob = new Blob([item.fileAttachment.data], { type: item.fileAttachment.type });
          fileToUpload = new File([blob], item.fileAttachment.name, { type: item.fileAttachment.type });
        }

        const res = await api.submitReport(
          item.text,
          fileToUpload,
          item.discipline,
          item.location
        );

        if (res && res.report_id) {
          await removeQueuedReport(item.id);
          syncedCount++;
        } else {
          // If response not confirmed, halt pass
          console.warn(`Could not sync queued report #${item.id}, halting queue flush.`);
          break;
        }
      } catch (err) {
        console.warn(`Network failure syncing queued report #${item.id}, stopping flush:`, err);
        // On network failure, leave it queued and stop attempting further ones in this pass
        break;
      }
    }

    if (syncedCount > 0) {
      notifySyncCompleted();
    }

    const remaining = (await getQueuedReports()).length;
    return { synced: syncedCount, remaining };
  } finally {
    isFlushing = false;
  }
}

/**
 * Registers background sync trigger if browser supports Background Sync API.
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'SyncManager' in (window as any)
  ) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'sync' in registration) {
        await (registration as any).sync.register('schedulesync-report-queue');
        return true;
      }
    } catch (err) {
      console.warn('Background sync registration failed, will rely on window online event:', err);
    }
  }
  return false;
}

/**
 * Initializes listeners for automatic queue syncing:
 * (a) window 'online' event
 * (b) Background Sync API
 * (c) initial app load
 */
let isInitialized = false;

export function initSyncManager(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // (a) Listen for window 'online' event
  window.addEventListener('online', () => {
    console.info('[SyncManager] Network connectivity restored. Flushing offline queue...');
    flushQueue();
  });

  // (b) Listen for service worker background sync messages if forwarded
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_REPORTS') {
        flushQueue();
      }
    });
  }

  // (c) Initial flush on load if already online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    setTimeout(() => {
      flushQueue();
    }, 1500);
  }
}
