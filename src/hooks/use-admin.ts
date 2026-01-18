'use client';
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';

export function useAdmin() {
  const { user, isUserLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    user.getIdTokenResult().then((idTokenResult) => {
      const isAdminClaim = !!idTokenResult.claims.admin;
      setIsAdmin(isAdminClaim);
      setIsLoading(false);
    });
  }, [user, isUserLoading]);

  return { isAdmin, isLoading };
}
