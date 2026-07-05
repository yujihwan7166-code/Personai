/**
 * 플래너 전용 레일 항목 — 공통 좌측 레일(AppWorkspaceShell)의 스위처 아래에 붙는다.
 *
 * 기존 PlannerLeftRail 의 핵심 기능(매트릭스·다가오는 일정·D-day·보관함·휴지통)을
 * 그대로 이식. 각 항목은 window CustomEvent 를 발행하고 Planner 페이지가 listen 한다
 * (홈·모드 전환은 공통 레일이 담당하므로 제외).
 */
import { CalendarClock, Grid2x2, Flag, Archive, Trash2 } from 'lucide-react';
import type { RailExtraItem } from '@/components/AppWorkspaceShell';
import { RAIL_EVENT } from './plannerRailEvents';

const dispatch = (eventName: string) => () =>
  window.dispatchEvent(new CustomEvent(eventName));

export const PLANNER_RAIL_ITEMS: RailExtraItem[] = [
  { id: 'matrix', label: '매트릭스', icon: Grid2x2, onClick: dispatch(RAIL_EVENT.openMatrix) },
  { id: 'agenda', label: '다가오는 일정', icon: CalendarClock, onClick: dispatch(RAIL_EVENT.openAgenda) },
  { id: 'dday', label: 'D-day 설정', icon: Flag, onClick: dispatch(RAIL_EVENT.openDdayCreate) },
  { id: 'library', label: '보관함', icon: Archive, onClick: dispatch(RAIL_EVENT.openLibrary) },
  { id: 'trash', label: '휴지통', icon: Trash2, onClick: dispatch(RAIL_EVENT.openTrash) },
];
