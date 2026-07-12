/**
 * 인맥노트 훅 — PEOPLE_CHANGED 구독.
 */
import { useEffect, useState } from 'react';
import { peopleStore } from '@/services/peopleStore';
import { PEOPLE_CHANGED, type Interaction, type Person } from '@/types/people';

export function usePersons(): Person[] {
  const [persons, setPersons] = useState<Person[]>(() => peopleStore.listPersons());
  useEffect(() => {
    const sync = () => setPersons(peopleStore.listPersons());
    window.addEventListener(PEOPLE_CHANGED, sync);
    return () => window.removeEventListener(PEOPLE_CHANGED, sync);
  }, []);
  return persons;
}

export function useInteractions(personId?: string): Interaction[] {
  const [items, setItems] = useState<Interaction[]>(() => peopleStore.listInteractions(personId));
  useEffect(() => {
    const sync = () => setItems(peopleStore.listInteractions(personId));
    sync();
    window.addEventListener(PEOPLE_CHANGED, sync);
    return () => window.removeEventListener(PEOPLE_CHANGED, sync);
  }, [personId]);
  return items;
}
