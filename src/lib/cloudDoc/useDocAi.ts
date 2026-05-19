/** 문서 AI 컨트롤러 훅 — 메뉴 / 미리보기 / placement 상태 관리.
 *
 *  흐름:
 *  - 메뉴 (열림/닫힘) — header ✨ / bubble ✨ / empty-line Space 셋 다 같은 메뉴 사용
 *  - 액션 실행 → busy 상태 → 결과 미리보기 카드
 *  - 미리보기 Accept(placement) → editor 에 결과 삽입 → 카드 닫힘
 *  - 미리보기 Retry → 같은 액션 재실행 (동일 컨텍스트)
 */

import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { toast } from '@/hooks/use-toast';
import {
  AI_ACTIONS, extractContext, runCustomAction,
  type AiActionDef, type ResultPlacement,
} from './aiActions';

export type MenuAnchor = 'header' | 'bubble' | 'empty-line';

interface PreviewState {
  result: string;
  actionLabel: string;
  defaultPlacement: ResultPlacement;
  /** retry 시 다시 호출할 함수 (이미 컨텍스트 묶음). */
  rerun: () => Promise<string>;
  /** Accept 시 본문에 적용할 함수. */
  applyToEditor: (text: string, placement: ResultPlacement) => void;
}

export function useDocAi(editor: Editor | null) {
  const [menuOpen, setMenuOpen] = useState<MenuAnchor | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const openMenu = useCallback((anchor: MenuAnchor) => {
    setMenuOpen(anchor);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(null), []);
  const closePreview = useCallback(() => setPreview(null), []);

  /** 결과를 editor 에 넣는 placement-aware 도우미. */
  const buildApplyToEditor = useCallback(
    (selSnapshot: { from: number; to: number }) => {
      return (text: string, placement: ResultPlacement) => {
        if (!editor || !text) return;
        const { from, to } = selSnapshot;
        const chain = editor.chain().focus();
        switch (placement) {
          case 'replace':
            if (from !== to) {
              chain.setTextSelection({ from, to }).insertContent(text).run();
            } else {
              chain.setTextSelection(from).insertContent(text).run();
            }
            break;
          case 'after':
            chain.setTextSelection(to).insertContent('\n' + text).run();
            break;
          case 'before':
            chain.setTextSelection(from).insertContent(text + '\n').run();
            break;
          case 'cursor':
            chain.insertContent(text).run();
            break;
          case 'doc-top':
            chain.setTextSelection(0).insertContent(text + '\n\n').run();
            break;
          case 'doc-end': {
            const end = editor.state.doc.content.size;
            chain.setTextSelection(end).insertContent('\n\n' + text).run();
            break;
          }
          case 'copy':
            void navigator.clipboard.writeText(text);
            toast({ title: '복사됨' });
            break;
        }
      };
    },
    [editor],
  );

  /** 빠른 액션 실행. */
  const runAction = useCallback(
    async (action: AiActionDef, subId?: string) => {
      if (!editor || busy) return;
      const ctx = extractContext(editor, action.scope);
      if (ctx.empty) {
        toast({ title: action.needsSelectionHint ?? '실행할 내용이 부족해요' });
        return;
      }
      const selSnapshot = { from: editor.state.selection.from, to: editor.state.selection.to };
      const apply = buildApplyToEditor(selSnapshot);
      setMenuOpen(null);
      setBusy(true);
      try {
        const result = await action.run(ctx.text, subId);
        if (!result) {
          toast({ title: `${action.label} — 결과가 비어있어요` });
          setBusy(false);
          return;
        }
        const labelWithSub = subId ? `${action.label} (${subId})` : action.label;
        setPreview({
          result,
          actionLabel: labelWithSub,
          defaultPlacement: action.defaultPlacement,
          rerun: () => action.run(ctx.text, subId),
          applyToEditor: apply,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({ title: `${action.label} 실패`, description: msg });
      } finally {
        setBusy(false);
      }
    },
    [editor, busy, buildApplyToEditor],
  );

  /** 자유 입력 prompt 실행. 선택+앞뒤 컨텍스트 자동 첨부. */
  const submitPrompt = useCallback(
    async (prompt: string) => {
      if (!editor || busy || !prompt.trim()) return;
      const ctx = extractContext(editor, 'around-selection');
      const selSnapshot = { from: editor.state.selection.from, to: editor.state.selection.to };
      const apply = buildApplyToEditor(selSnapshot);
      setMenuOpen(null);
      setBusy(true);
      try {
        const result = await runCustomAction(prompt, ctx.text);
        if (!result) {
          toast({ title: '결과가 비어있어요' });
          setBusy(false);
          return;
        }
        // 선택 있으면 replace, 없으면 cursor (현재 위치)
        const hasSelection = selSnapshot.from !== selSnapshot.to;
        setPreview({
          result,
          actionLabel: `AI: ${prompt.slice(0, 30)}${prompt.length > 30 ? '…' : ''}`,
          defaultPlacement: hasSelection ? 'replace' : 'cursor',
          rerun: () => runCustomAction(prompt, ctx.text),
          applyToEditor: apply,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({ title: 'AI 실패', description: msg });
      } finally {
        setBusy(false);
      }
    },
    [editor, busy, buildApplyToEditor],
  );

  /** 미리보기 [↻ 다시] — 같은 컨텍스트로 재실행. */
  const retryPreview = useCallback(async () => {
    if (!preview || busy) return;
    setBusy(true);
    try {
      const result = await preview.rerun();
      if (!result) {
        toast({ title: '결과가 비어있어요' });
        setBusy(false);
        return;
      }
      setPreview({ ...preview, result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '재시도 실패', description: msg });
    } finally {
      setBusy(false);
    }
  }, [preview, busy]);

  /** 미리보기 [✓ 수락] — placement 로 본문 적용. */
  const acceptPreview = useCallback(
    (placement: ResultPlacement) => {
      if (!preview) return;
      preview.applyToEditor(preview.result, placement);
      setPreview(null);
    },
    [preview],
  );

  /** 미리보기 [✏ 수정] — 사용자가 결과 직접 편집. */
  const editPreview = useCallback(
    (next: string) => {
      if (!preview) return;
      setPreview({ ...preview, result: next });
    },
    [preview],
  );

  return {
    // 메뉴
    menuOpen, openMenu, closeMenu,
    // 실행
    busy, runAction, submitPrompt,
    // 미리보기
    preview, acceptPreview, rejectPreview: closePreview, retryPreview, editPreview,
    // 메타 — UI 에서 직접 메뉴를 그릴 때 필요
    actions: AI_ACTIONS,
  };
}
