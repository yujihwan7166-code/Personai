import { describe, expect, it } from 'vitest';
import {
  PAGE_AI_LAUNCHER_POSITION_CLASS,
  PAGE_AI_LAUNCHER_SIZE_CLASS,
  PAGE_AI_PANEL_SCROLL_CLASS,
  PAGE_AI_PANEL_SLOT_CLASS,
  PAGE_AI_PANEL_SURFACE_CLASS,
  PAGE_AI_PANEL_TRANSITION_CLASS,
  PAGE_AI_PANEL_WIDTH,
  clampPageAiPanelWidth,
} from '@/components/PageAiTokens';

describe('PageAiTokens', () => {
  it('keeps AI panel widths on the shared workspace range', () => {
    expect(PAGE_AI_PANEL_WIDTH).toEqual({ min: 300, max: 420, default: 340 });
    expect(clampPageAiPanelWidth(330)).toBe(330);
    expect(clampPageAiPanelWidth(200)).toBe(300);
    expect(clampPageAiPanelWidth(700)).toBe(420);
  });

  it('keeps shared AI panel shell classes centralized', () => {
    expect(PAGE_AI_PANEL_SURFACE_CLASS).toContain('border-l');
    expect(PAGE_AI_PANEL_SURFACE_CLASS).toContain('shadow-');
    expect(PAGE_AI_PANEL_TRANSITION_CLASS).toContain('transition-[width,transform]');
    expect(PAGE_AI_PANEL_SLOT_CLASS).toContain('fixed');
    expect(PAGE_AI_PANEL_SLOT_CLASS).toContain('sm:static');
    expect(PAGE_AI_PANEL_SLOT_CLASS).toContain('sm:self-stretch');
    expect(PAGE_AI_PANEL_SCROLL_CLASS).toContain('overscroll-contain');
  });

  it('keeps AI launchers visually aligned across workspace labels', () => {
    expect(PAGE_AI_LAUNCHER_POSITION_CLASS).toContain('right-[calc(0.5rem');
    expect(PAGE_AI_LAUNCHER_POSITION_CLASS).toContain('sm:right-[calc(9rem');
    expect(PAGE_AI_LAUNCHER_POSITION_CLASS).toContain('env(safe-area-inset-top)');
    expect(PAGE_AI_LAUNCHER_POSITION_CLASS).toContain('env(safe-area-inset-right)');
    expect(PAGE_AI_LAUNCHER_SIZE_CLASS).toContain('w-8');
    expect(PAGE_AI_LAUNCHER_SIZE_CLASS).toContain('sm:w-[94px]');
  });
});
