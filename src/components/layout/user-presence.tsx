
'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useRealtimeDB } from '@/firebase';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';

export function UserPresence() {
  const { user } = useUser();
  const firestore = useFirestore();
  const realtimeDB = useRealtimeDB();

  useEffect(() => {
    if (user?.uid && firestore && realtimeDB) {
      const userStatusRef = doc(firestore, 'users', user.uid);
      
      const onlineStatus = {
        onlineStatus: 'online',
        lastSeen: serverTimestamp(),
      };

      updateDoc(userStatusRef, onlineStatus);
      
      // Realtime Database for presence system
      const userPresenceRef = ref(realtimeDB, `/presence/${user.uid}`);

      // Set online status in RTDB when user connects
      const presencePayload = {
        state: 'online',
        lastChanged: rtdbServerTimestamp(),
      };
      set(userPresenceRef, presencePayload);

      // Set onDisconnect hook to handle abrupt disconnection
      onDisconnect(userPresenceRef).set({
        state: 'offline',
        lastChanged: rtdbServerTimestamp(),
      });
      
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
  }, [user, firestore, realtimeDB]);

  return null; // This component does not render anything
}
