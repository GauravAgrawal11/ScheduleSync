/**
 * ScheduleSync Supervisor Offline Queue
 * Uses IndexedDB (via idb) to store pending site report submissions when offline.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface QueuedFileAttachment {
  name: string;
  type: string;
  data: ArrayBuffer;
}

export interface QueuedReportPayload {
  id: string;
  text: string;
  discipline: string;
  location: string;
  fileAttachment?: QueuedFileAttachment | null;
  status: 'pending_sync';
  queued_at: string;
}

interface ScheduleSyncDB extends DBSchema {
  pending_reports: {
    key: string;
    value: QueuedReportPayload;
    indexes: { 'by-queued-at': string };
  };
}

const DB_NAME = 'schedulesync_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_reports';

let dbPromise: Promise<IDBPDatabase<ScheduleSyncDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ScheduleSyncDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ScheduleSyncDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-queued-at', 'queued_at');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Saves a report submission into the local IndexedDB store with status "pending_sync".
 */
export async function queueReport(params: {
  text: string;
  discipline?: string;
  location?: string;
  file?: File | null;
}): Promise<QueuedReportPayload> {
  const db = await getDb();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  let fileAttachment: QueuedFileAttachment | null = null;
  if (params.file) {
    const arrayBuffer = await params.file.arrayBuffer();
    fileAttachment = {
      name: params.file.name,
      type: params.file.type,
      data: arrayBuffer,
    };
  }

  const queuedItem: QueuedReportPayload = {
    id,
    text: params.text,
    discipline: params.discipline || 'Piping',
    location: params.location || 'Unit 3',
    fileAttachment,
    status: 'pending_sync',
    queued_at: new Date().toISOString(),
  };

  await db.put(STORE_NAME, queuedItem);
  return queuedItem;
}

/**
 * Returns all currently queued reports ordered by queued_at (oldest first).
 */
export async function getQueuedReports(): Promise<QueuedReportPayload[]> {
  try {
    const db = await getDb();
    const all = await db.getAllFromIndex(STORE_NAME, 'by-queued-at');
    return all;
  } catch (err) {
    console.warn('Could not read queued reports from IndexedDB:', err);
    return [];
  }
}

/**
 * Removes one entry once it's successfully synced.
 */
export async function removeQueuedReport(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
  } catch (err) {
    console.warn(`Could not remove queued report #${id}:`, err);
  }
}
