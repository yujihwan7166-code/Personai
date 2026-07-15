/**
 * 건강기록 store 구독 훅.
 * HEALTH_CHANGED 이벤트로 자동 re-render. 최초 마운트 시 예시 데이터 시드.
 *
 * TDZ 주의: state 선언 → refresh(useCallback) → useEffect 순서 엄수.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  HEALTH_CHANGED,
  type HealthMed,
  type HealthSymptom,
  type HealthVisit,
  type VitalReading,
} from '@/types/health';
import { healthStore } from '@/services/healthStore';

export interface HealthData {
  vitals: VitalReading[];
  meds: HealthMed[];
  visits: HealthVisit[];
  symptoms: HealthSymptom[];
}

export function useHealth(): HealthData {
  const [data, setData] = useState<HealthData>(() => ({ vitals: [], meds: [], visits: [], symptoms: [] }));

  const refresh = useCallback(() => {
    setData({
      vitals: healthStore.listVitals(),
      meds: healthStore.listMeds(),
      visits: healthStore.listVisits(),
      symptoms: healthStore.listSymptoms(),
    });
  }, []);

  useEffect(() => {
    healthStore.ensureSeeded();
    refresh();
    window.addEventListener(HEALTH_CHANGED, refresh);
    return () => window.removeEventListener(HEALTH_CHANGED, refresh);
  }, [refresh]);

  return data;
}
