'use client';

import * as React from 'react';

import type { PlateEditor, PlateElementProps } from 'platejs/react';

import {
  ChevronRightIcon,
  Code2,
  Columns3Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Image as ImageIcon,
  LightbulbIcon,
  Link as LinkIcon,
  ListIcon,
  ListOrdered,
  PilcrowIcon,
  Quote,
  RadicalIcon,
  Square,
  Table,
  TableOfContentsIcon,
} from 'lucide-react';
import { type TComboboxInputElement, KEYS } from 'platejs';
import { PlateElement } from 'platejs/react';

import {
  insertBlock,
  insertInlineElement,
} from '@/components/plate/editor/transforms';

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from './inline-combobox';

type Group = {
  group: string;
  items: {
    icon: React.ReactNode;
    value: string;
    onSelect: (editor: PlateEditor, value: string) => void;
    className?: string;
    focusEditor?: boolean;
    keywords?: string[];
    label?: string;
  }[];
};

const groups: Group[] = [
  {
    group: '기본',
    items: [
      {
        icon: <PilcrowIcon />,
        keywords: ['paragraph', 'text', '본문', '글'],
        label: '텍스트',
        value: KEYS.p,
      },
      {
        icon: <Heading1Icon />,
        keywords: ['title', 'h1', '대제목'],
        label: '제목 1',
        value: KEYS.h1,
      },
      {
        icon: <Heading2Icon />,
        keywords: ['h2', '중제목'],
        label: '제목 2',
        value: KEYS.h2,
      },
      {
        icon: <Heading3Icon />,
        keywords: ['h3', '소제목'],
        label: '제목 3',
        value: KEYS.h3,
      },
      {
        icon: <ListIcon />,
        keywords: ['bullet', 'ul', '불릿', '글머리', '-'],
        label: '글머리 목록',
        value: KEYS.ul,
      },
      {
        icon: <ListOrdered />,
        keywords: ['numbered', 'ol', '번호', '순서', '1'],
        label: '번호 목록',
        value: KEYS.ol,
      },
      {
        icon: <Square />,
        keywords: ['todo', 'checkbox', 'task', '체크', '할일', '[]'],
        label: '체크리스트',
        value: KEYS.listTodo,
      },
      {
        icon: <ChevronRightIcon />,
        keywords: ['toggle', 'collapsible', '접기', '펼치기'],
        label: '토글',
        value: KEYS.toggle,
      },
      {
        icon: <Quote />,
        keywords: ['quote', 'blockquote', '인용', '>'],
        label: '인용',
        value: KEYS.blockquote,
      },
      {
        icon: <Code2 />,
        keywords: ['code', '코드', '```'],
        label: '코드 블록',
        value: KEYS.codeBlock,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: '삽입',
    items: [
      {
        icon: <Table />,
        keywords: ['table', '표', '테이블'],
        label: '표',
        value: KEYS.table,
      },
      {
        icon: <ImageIcon />,
        keywords: ['image', 'img', '이미지', '사진', '그림'],
        label: '이미지',
        value: KEYS.img,
      },
      {
        icon: <LightbulbIcon />,
        keywords: ['callout', 'note', '콜아웃', '강조'],
        label: '콜아웃',
        value: KEYS.callout,
      },
      {
        icon: <Columns3Icon />,
        keywords: ['columns', '다단', '단', '열'],
        label: '다단 (3열)',
        value: 'action_three_columns',
      },
      {
        icon: <TableOfContentsIcon />,
        keywords: ['toc', '목차'],
        label: '목차',
        value: KEYS.toc,
      },
      {
        focusEditor: false,
        icon: <RadicalIcon />,
        keywords: ['equation', 'math', '수식'],
        label: '수식',
        value: KEYS.equation,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: '인라인',
    items: [
      {
        focusEditor: false,
        icon: <RadicalIcon />,
        keywords: ['inline equation', '수식'],
        label: '인라인 수식',
        value: KEYS.inlineEquation,
      },
      {
        focusEditor: true,
        icon: <LinkIcon />,
        keywords: ['link', 'url', '링크'],
        label: '링크',
        value: KEYS.link,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertInlineElement(editor, value);
      },
    })),
  },
];

export function SlashInputElement(
  props: PlateElementProps<TComboboxInputElement>
) {
  const { editor, element } = props;

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox element={element} trigger="/">
        <InlineComboboxInput />

        <InlineComboboxContent>
          <InlineComboboxEmpty>No results</InlineComboboxEmpty>

          {groups.map(({ group, items }) => (
            <InlineComboboxGroup key={group}>
              <InlineComboboxGroupLabel>{group}</InlineComboboxGroupLabel>

              {items.map(
                ({ focusEditor, icon, keywords, label, value, onSelect }) => (
                  <InlineComboboxItem
                    key={value}
                    value={value}
                    onClick={() => onSelect(editor, value)}
                    label={label}
                    focusEditor={focusEditor}
                    group={group}
                    keywords={keywords}
                  >
                    <div className="mr-2 text-muted-foreground">{icon}</div>
                    {label ?? value}
                  </InlineComboboxItem>
                )
              )}
            </InlineComboboxGroup>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
}
