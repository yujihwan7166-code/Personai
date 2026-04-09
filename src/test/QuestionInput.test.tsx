import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuestionInput } from '@/components/QuestionInput';
import * as fileProcessor from '@/lib/fileProcessor';

vi.mock('@/lib/fileProcessor', async () => {
  const actual = await vi.importActual<typeof import('@/lib/fileProcessor')>('@/lib/fileProcessor');

  return {
    ...actual,
    buildAttachmentPrompt: vi.fn(() => '이 PDF를 읽고 핵심 내용을 요약해줘.'),
    validateFile: vi.fn(() => null),
    processFile: vi.fn(async (file: File) => ({
      id: `mock-${file.name}`,
      name: file.name,
      mimeType: file.type || 'application/pdf',
      size: file.size,
      base64: 'ZmFrZQ==',
    })),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('QuestionInput', () => {
  it('renders in general mode without crashing on first paint', () => {
    expect(() =>
      render(<QuestionInput onSubmit={() => {}} discussionMode="general" />)
    ).not.toThrow();

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders in procon mode with the file input available', () => {
    const { container } = render(<QuestionInput onSubmit={() => {}} discussionMode="procon" />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('submits with an auto-generated prompt when only files are attached', async () => {
    const onSubmit = vi.fn();
    const onSubmitWithFiles = vi.fn();
    const { container } = render(
      <QuestionInput
        onSubmit={onSubmit}
        onSubmitWithFiles={onSubmitWithFiles}
        discussionMode="general"
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;
    const file = new File(['pdf'], 'summary.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(fileProcessor.processFile).toHaveBeenCalledTimes(1);
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmitWithFiles).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onSubmitWithFiles).toHaveBeenCalledWith(
      '이 PDF를 읽고 핵심 내용을 요약해줘.',
      expect.arrayContaining([
        expect.objectContaining({
          name: 'summary.pdf',
        }),
      ])
    );
  });

  it('shows a validation error when file validation fails', async () => {
    vi.mocked(fileProcessor.validateFile).mockReturnValueOnce('지원하지 않는 형식이에요.');

    const { container } = render(<QuestionInput onSubmit={() => {}} discussionMode="general" />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['bad'], 'bad.exe', { type: 'application/octet-stream' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('지원하지 않는 형식이에요.')).toBeInTheDocument();
    });
  });
});
