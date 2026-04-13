import type { PptData } from '@/lib/pptGenerator';

interface PptDownloadCardProps {
  content: string;
  loadPptGenerator: () => Promise<typeof import('@/lib/pptGenerator')>;
}

function parsePptData(content: string): PptData | null {
  try {
    const parsed = JSON.parse(content) as Partial<PptData> | null;
    if (!parsed || !Array.isArray(parsed.slides)) return null;
    return parsed as PptData;
  } catch {
    return null;
  }
}

export function PptDownloadCard({ content, loadPptGenerator }: PptDownloadCardProps) {
  const pptData = parsePptData(content);

  if (!pptData) return null;

  async function handleDownload() {
    const pptTools = await loadPptGenerator();
    await pptTools.generatePpt(pptData, `presentation-${Date.now()}.pptx`);
  }

  return (
    <div className="flex justify-center py-3">
      <button
        type="button"
        onClick={() => {
          void handleDownload();
        }}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-[13px] font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
      >
        <span className="text-[18px]">📊</span>
        PPT 다운로드 ({pptData.slides.length}장)
      </button>
    </div>
  );
}
