'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

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

      // Set user to online when the component mounts and user is available
      updateDoc(userStatusRef, onlineStatus);
      
      const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
          if (user?.uid) {
            const userStatusRef = doc(firestore, 'users', user.uid);
            await updateDoc(userStatusRef, {
                onlineStatus: 'offline',
                lastSeen: serverTimestamp(),
            });
          }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user, firestore]);

  return null; // This component does not render anything
}
