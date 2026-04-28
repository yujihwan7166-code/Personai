/**
 * 시드 데이터 통합 — 4 메인 + 모든 하위 페이지를 한 배열로 export.
 * 각 도메인 파일은 자기 메인 id 를 새로 생성하고, 하위에 parentMocs 부착해
 * 자급자족(self-contained) 형태로 반환한다.
 */

import type { WikiPage } from '@/types/wiki';
import { buildOwnerPages } from './ownerProfile';
import { buildRelationshipsPages } from './relationships';
import { buildProjectsPages } from './projects';
import { buildStocksPages } from './stocks';

/**
 * 새 시드 페이지 묶음 생성. 호출할 때마다 새 id 가 부여되니 한 번만 호출해
 * `seedWiki()` 로 저장.
 */
export function buildAllSeedPages(): WikiPage[] {
  return [
    ...buildOwnerPages(),
    ...buildRelationshipsPages(),
    ...buildProjectsPages(),
    ...buildStocksPages(),
  ];
}
