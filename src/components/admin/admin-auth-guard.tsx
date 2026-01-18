'use client';
import { useAdmin } from '@/hooks/use-admin';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/'); // Redirect non-admins to home page
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="w-full max-w-4xl p-8 space-y-4">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
             <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }
  
  if(!isAdmin) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
