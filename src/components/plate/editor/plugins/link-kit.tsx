'use client';

import { LinkRules } from '@platejs/link';
import { LinkPlugin } from '@platejs/link/react';

import { LinkElement } from '@/components/plate/ui/link-node';
import { LinkFloatingToolbar } from '@/components/plate/ui/link-toolbar';

export const LinkKit = [
  LinkPlugin.configure({
    // wiki:// = 마이위키 문서 링크 스킴 — 기본 새니타이저가 href 를 지워버리므로 허용 목록에 추가
    options: { allowedSchemes: ['http', 'https', 'mailto', 'tel', 'wiki'] },
    inputRules: [
      LinkRules.markdown(),
      LinkRules.autolink({ variant: 'paste' }),
      LinkRules.autolink({ variant: 'space' }),
      LinkRules.autolink({ variant: 'break' }),
    ],
    render: {
      node: LinkElement,
      afterEditable: () => <LinkFloatingToolbar />,
    },
  }),
];
