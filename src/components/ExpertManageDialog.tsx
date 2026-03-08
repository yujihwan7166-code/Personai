import { useState } from 'react';
import { Expert, EXPERT_COLORS, EXPERT_COLOR_LABELS, ExpertColor } from '@/types/expert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  experts: Expert[];
  onUpdate: (experts: Expert[]) => void;
}

const colorDotClasses: Record<ExpertColor, string> = {
  gpt: 'bg-expert-gpt',
  gemini: 'bg-expert-gemini',
  medical: 'bg-expert-medical',
  investment: 'bg-expert-investment',
};

export function ExpertManageDialog({ experts, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [form, setForm] = useState({ nameKo: '', icon: '', color: 'gpt' as ExpertColor, systemPrompt: '' });

  const resetForm = () => {
    setForm({ nameKo: '', icon: '', color: 'gpt', systemPrompt: '' });
    setEditingExpert(null);
    setIsAdding(false);
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const startEdit = (expert: Expert) => {
    setForm({ nameKo: expert.nameKo, icon: expert.icon, color: expert.color, systemPrompt: expert.systemPrompt });
    setEditingExpert(expert);
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!form.nameKo.trim() || !form.icon.trim()) return;

    if (editingExpert) {
      onUpdate(experts.map(e => e.id === editingExpert.id ? {
        ...e, nameKo: form.nameKo, icon: form.icon, color: form.color, systemPrompt: form.systemPrompt,
        name: form.nameKo,
      } : e));
    } else {
      const newExpert: Expert = {
        id: `custom-${Date.now()}`,
        name: form.nameKo,
        nameKo: form.nameKo,
        icon: form.icon,
        color: form.color,
        systemPrompt: form.systemPrompt || `You are ${form.nameKo}. Provide expert analysis from your perspective. Respond in Korean. Engage with other experts' opinions.`,
      };
      onUpdate([...experts, newExpert]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    onUpdate(experts.filter(e => e.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">토론자 관리</DialogTitle>
        </DialogHeader>

        {!isAdding ? (
          <div className="space-y-3">
            {experts.map(expert => (
              <div key={expert.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                <span className="text-xl">{expert.icon}</span>
                <span className="flex-1 text-sm font-medium text-foreground">{expert.nameKo}</span>
                <div className={cn('w-3 h-3 rounded-full', colorDotClasses[expert.color])} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(expert)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(expert.id)} disabled={experts.length <= 2}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button onClick={startAdd} variant="outline" className="w-full gap-2" disabled={experts.length >= 6}>
              <Plus className="w-4 h-4" /> 전문가 추가
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input value={form.nameKo} onChange={e => setForm(f => ({ ...f, nameKo: e.target.value }))} placeholder="예: 법률 전문가" />
            </div>
            <div className="space-y-2">
              <Label>아이콘 (이모지)</Label>
              <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="예: ⚖️" className="text-center text-xl" maxLength={4} />
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex gap-2">
                {EXPERT_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all',
                      form.color === c ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-muted-foreground'
                    )}>
                    <div className={cn('w-2.5 h-2.5 rounded-full', colorDotClasses[c])} />
                    {EXPERT_COLOR_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>시스템 프롬프트 (선택)</Label>
              <textarea value={form.systemPrompt} onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
                placeholder="전문가의 역할과 성격을 설명하세요..."
                className="w-full bg-card border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">취소</Button>
              <Button onClick={handleSave} className="flex-1" disabled={!form.nameKo.trim() || !form.icon.trim()}>
                {editingExpert ? '수정' : '추가'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
