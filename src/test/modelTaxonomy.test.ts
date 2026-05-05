import { describe, it, expect } from 'vitest';
import { DEFAULT_EXPERTS } from '@/types/expert';
import {
  MODEL_BRAND,
  MODEL_IS_OPENSOURCE,
  MODEL_IS_REASONING,
  RECOMMENDED_MODEL_IDS,
  BRAND_LABEL,
  BRAND_ORDER,
  getBrandOf,
} from '@/lib/modelTaxonomy';

const aiModels = DEFAULT_EXPERTS.filter((e) => e.category === 'ai' && e.id !== 'router');
const aiIdSet = new Set(aiModels.map((e) => e.id));

describe('modelTaxonomy', () => {
  describe('MODEL_BRAND 매핑', () => {
    it('카탈로그의 모든 AI 모델이 브랜드 매핑에 존재해야 한다 (router 제외)', () => {
      const missing = aiModels
        .map((e) => e.id)
        .filter((id) => !(id in MODEL_BRAND));
      // ancano-pro 같은 에이전트형은 브랜드 매핑에서 제외 가능 — 단, 현재 카탈로그 기준 누락이 0 이어야
      // 새 모델 추가 시 modelTaxonomy.ts 동시 갱신 강제.
      expect(missing, `브랜드 매핑 누락: ${missing.join(', ')}`).toEqual([]);
    });

    it('브랜드 매핑의 모든 ID 가 BRAND_ORDER 의 브랜드 중 하나여야 한다', () => {
      const validBrands = new Set(BRAND_ORDER);
      Object.entries(MODEL_BRAND).forEach(([id, brand]) => {
        expect(validBrands.has(brand), `${id} → 알 수 없는 브랜드: ${brand}`).toBe(true);
      });
    });

    it('BRAND_LABEL 이 모든 브랜드를 커버해야 한다', () => {
      BRAND_ORDER.forEach((brand) => {
        expect(BRAND_LABEL[brand]).toBeTruthy();
      });
    });
  });

  describe('MODEL_IS_OPENSOURCE', () => {
    it('오픈소스 셋의 모든 ID 가 실제 카탈로그에 존재해야 한다', () => {
      const stale = [...MODEL_IS_OPENSOURCE].filter((id) => !aiIdSet.has(id));
      expect(stale, `삭제된 모델이 남아있음: ${stale.join(', ')}`).toEqual([]);
    });

    it('Closed 라인(GPT/Claude/Gemini Pro/메인)이 오픈소스로 분류되어 있지 않아야 한다', () => {
      const mustBeClosed = ['gpt', 'gpt-mini', 'gpt-nano', 'claude', 'claude-sonnet', 'claude-haiku', 'gemini', 'gemini-pro', 'grok'];
      mustBeClosed.forEach((id) => {
        if (aiIdSet.has(id)) {
          expect(MODEL_IS_OPENSOURCE.has(id), `${id} 가 오픈소스로 잘못 분류됨`).toBe(false);
        }
      });
    });
  });

  describe('MODEL_IS_REASONING', () => {
    it('추론 셋의 모든 ID 가 실제 카탈로그에 존재해야 한다', () => {
      const stale = [...MODEL_IS_REASONING].filter((id) => !aiIdSet.has(id));
      expect(stale, `삭제된 모델이 남아있음: ${stale.join(', ')}`).toEqual([]);
    });
  });

  describe('RECOMMENDED_MODEL_IDS', () => {
    it('추천 셋의 모든 ID 가 실제 카탈로그에 존재해야 한다', () => {
      const stale = RECOMMENDED_MODEL_IDS.filter((id) => !aiIdSet.has(id));
      expect(stale, `삭제된 모델이 남아있음: ${stale.join(', ')}`).toEqual([]);
    });

    it('추천 모델 수가 5~10개 범위 안이어야 한다 (사용자 결정 비용 관리)', () => {
      expect(RECOMMENDED_MODEL_IDS.length).toBeGreaterThanOrEqual(5);
      expect(RECOMMENDED_MODEL_IDS.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getBrandOf 헬퍼', () => {
    it('알 수 없는 ID 는 other 로 fallback', () => {
      expect(getBrandOf('definitely-not-real-model-xyz')).toBe('other');
    });
  });
});
