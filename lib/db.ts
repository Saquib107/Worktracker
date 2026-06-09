import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface WorkTrackerDB extends DBSchema {
  pending_reports: {
    key: string;
    value: {
      id: string;
      date: string;
      department: string;
      kra: string;
      tasks: string;
      hours: number;
      task_status: string;
      has_issue: boolean;
      issue_desc: string;
      plan_tomorrow: string;
      user_id?: string;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<WorkTrackerDB>> | null = null;

export const getDB = () => {
  if (typeof window === 'undefined') return null; // Avoid running on server

  if (!dbPromise) {
    dbPromise = openDB<WorkTrackerDB>('worktracker-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending_reports')) {
          db.createObjectStore('pending_reports', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const savePendingReport = async (report: any) => {
  const db = await getDB();
  if (!db) return;
  
  const id = `pending-${Date.now()}`;
  await db.put('pending_reports', { ...report, id, timestamp: Date.now() });
  return id;
};

export const getPendingReports = async () => {
  const db = await getDB();
  if (!db) return [];
  return await db.getAll('pending_reports');
};

export const deletePendingReport = async (id: string) => {
  const db = await getDB();
  if (!db) return;
  await db.delete('pending_reports', id);
};
