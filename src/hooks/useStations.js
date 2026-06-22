/**
 * useStations — admin CRUD for the /stations Firestore collection.
 *
 * addStation(data)        — create a new station doc (auto-ID)
 * updateStation(id, data) — update any fields on an existing station
 * deleteStation(id)       — delete a station doc
 *
 * The id stored inside the document is kept in sync on add.
 */
import { useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useStations() {
  const addStation = useCallback(async (data) => {
    // Let Firestore auto-generate the doc ID, then write it back as the
    // station’s own `id` field so the rest of the UI can use it uniformly.
    const ref = await addDoc(collection(db, 'stations'), {
      name:          data.name          || '',
      type:          data.type          || 'ps5',
      preferredGame: data.preferredGame || '',
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  }, []);

  const updateStation = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'stations', id), data);
  }, []);

  const deleteStation = useCallback(async (id) => {
    await deleteDoc(doc(db, 'stations', id));
  }, []);

  return { addStation, updateStation, deleteStation };
}
