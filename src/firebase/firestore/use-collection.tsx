'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/* Internal implementation of Query */
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
    };
  };
}

/**
 * React hook to subscribe to a Firestore QUERY in real-time.
 *
 * 🚨 IMPORTANT:
 * - This hook ONLY accepts Firestore Query objects
 * - CollectionReference is FORBIDDEN (will throw immediately)
 * - This prevents unsafe `list()` calls that violate security rules
 */
export function useCollection<T = any>(
  memoizedQuery: (Query<DocumentData> & { __memo?: boolean }) | null | undefined,
): UseCollectionResult<T> {

  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // 🚫 HARD GUARD: CollectionReference is NOT allowed
    if ((memoizedQuery as any).type === 'collection') {
      throw new Error(
        'useCollection ERROR: CollectionReference is forbidden. ' +
        'Always pass a Firestore Query with where() constraints.'
      );
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id,
        }));

        setData(results);
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        const path =
          (memoizedQuery as unknown as InternalQuery)._query.path.canonicalString();

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  // Enforce memoization contract
  if (memoizedQuery && !('__memo' in memoizedQuery)) {
    throw new Error(
      'useCollection ERROR: Query must be memoized using useMemoFirebase'
    );
  }

  return { data, isLoading, error };
}
