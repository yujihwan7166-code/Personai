/**
 * 여행기록 훅 — travelStore 구독 (TRAVEL_CHANGED 하나로 전부 갱신).
 */
import { useEffect, useState } from 'react';
import { travelStore } from '@/services/travelStore';
import { TRAVEL_CHANGED, type BucketPlace, type TravelRecord, type Trip } from '@/types/travel';

export function useTrips(): Trip[] {
  const [trips, setTrips] = useState<Trip[]>(() => travelStore.listTrips());
  useEffect(() => {
    const sync = () => setTrips(travelStore.listTrips());
    window.addEventListener(TRAVEL_CHANGED, sync);
    return () => window.removeEventListener(TRAVEL_CHANGED, sync);
  }, []);
  return trips;
}

export function useTripRecords(tripId: string | null): TravelRecord[] {
  const [records, setRecords] = useState<TravelRecord[]>(() =>
    tripId ? travelStore.listRecords(tripId) : [],
  );
  useEffect(() => {
    const sync = () => setRecords(tripId ? travelStore.listRecords(tripId) : []);
    sync();
    window.addEventListener(TRAVEL_CHANGED, sync);
    return () => window.removeEventListener(TRAVEL_CHANGED, sync);
  }, [tripId]);
  return records;
}

export function useAllRecords(): TravelRecord[] {
  const [records, setRecords] = useState<TravelRecord[]>(() => travelStore.listAllRecords());
  useEffect(() => {
    const sync = () => setRecords(travelStore.listAllRecords());
    window.addEventListener(TRAVEL_CHANGED, sync);
    return () => window.removeEventListener(TRAVEL_CHANGED, sync);
  }, []);
  return records;
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
