/**
 * 여행 훅 — travelStore(여행 메타·버킷) 구독. 기록은 useDaylog 훅이 담당.
 */
import { useEffect, useState } from 'react';
import { travelStore } from '@/services/travelStore';
import { TRAVEL_CHANGED, type BucketPlace, type Trip } from '@/types/travel';

export function useTrips(): Trip[] {
  const [trips, setTrips] = useState<Trip[]>(() => travelStore.listTrips());
  useEffect(() => {
    const sync = () => setTrips(travelStore.listTrips());
    window.addEventListener(TRAVEL_CHANGED, sync);
    return () => window.removeEventListener(TRAVEL_CHANGED, sync);
  }, []);
  return trips;
}

export function useBucket(): BucketPlace[] {
  const [bucket, setBucket] = useState<BucketPlace[]>(() => travelStore.listBucket());
  useEffect(() => {
    const sync = () => setBucket(travelStore.listBucket());
    window.addEventListener(TRAVEL_CHANGED, sync);
    return () => window.removeEventListener(TRAVEL_CHANGED, sync);
  }, []);
  return bucket;
}
