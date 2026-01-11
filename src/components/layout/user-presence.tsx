'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function UserPresence() {
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (user?.uid && firestore) {
      const userStatusRef = doc(firestore, 'users', user.uid);
      
      const onlineStatus = {
        onlineStatus: 'online',
        lastSeen: serverTimestamp(),
      };
      
      const offlineStatus = {
        onlineStatus: 'offline',
        lastSeen: serverTimestamp(),
      };

      // Set user to online
      setDoc(userStatusRef, onlineStatus, { merge: true });

      const handleBeforeUnload = () => {
        // This is not guaranteed to run, but it's a good-faith effort
        // to set the user as offline when they close the tab.
        // A more robust solution might involve a Cloud Function
        // to clean up stale online statuses.
        setDoc(userStatusRef, offlineStatus, { merge: true });
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        // When the component unmounts (e.g., user logs out), set to offline.
        setDoc(userStatusRef, offlineStatus, { merge: true });
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user, firestore]);

  return null; // This component does not render anything
}
