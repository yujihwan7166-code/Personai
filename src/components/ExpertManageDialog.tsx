import { useState } from 'react';
import { Expert, EXPERT_COLORS, EXPERT_COLOR_LABELS, ExpertColor, ExpertCategory, EXPERT_CATEGORY_LABELS } from '@/types/expert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Trash2, Pencil, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  experts: Expert[];
  onUpdate: (experts: Expert[]) => void;
}

const colorDotClasses: Record<ExpertColor, string> = {
  blue: 'bg-expert-blue', emerald: 'bg-expert-emerald', red: 'bg-expert-red', amber: 'bg-expert-amber',
  purple: 'bg-expert-purple', orange: 'bg-expert-orange', teal: 'bg-expert-teal', pink: 'bg-expert-pink',
};

function SortableExpertItem({ expert, onEdit, onDelete, canDelete }: {
  expert: Expert; onEdit: () => void; onDelete: () => void; canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: expert.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}
      className={cn('flex items-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border transition-all',
        isDragging && 'opacity-50 ring-2 ring-primary/30'
      )}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-lg">{expert.icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground block">{expert.nameKo}</span>
        <span className="text-[10px] text-muted-foreground">{expert.description}</span>
      </div>
      <div className={cn('w-3 h-3 rounded-full', colorDotClasses[expert.color])} />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
        <Pencil className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} disabled={!canDelete}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

export function ExpertManageDialog({ experts, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ nameKo: '', icon: '', color: 'blue' as ExpertColor, description: '', category: 'ai' as ExpertCategory });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const resetForm = () => { setForm({ nameKo: '', icon: '', color: 'blue', description: '', category: 'ai' }); setEditingExpert(null); setIsAdding(false); };
  const startAdd = () => { resetForm(); setIsAdding(true); };
  const startEdit = (expert: Expert) => {
    setForm({ nameKo: expert.nameKo, icon: expert.icon, color: expert.color, description: expert.description, category: expert.category });
    setEditingExpert(expert); setIsAdding(true);
  };

  const handleSave = () => {
    if (!form.nameKo.trim() || !form.icon.trim()) return;
    if (editingExpert) {
      onUpdate(experts.map(e => e.id === editingExpert.id ? { ...e, nameKo: form.nameKo, name: form.nameKo, icon: form.icon, color: form.color, description: form.description, category: form.category } : e));
    } else {
      const desc = form.description.trim() || `${form.nameKo} 전문가`;
      onUpdate([...experts, {
        id: `custom-${Date.now()}`, name: form.nameKo, nameKo: form.nameKo, icon: form.icon, color: form.color,
        description: desc, category: form.category,
        systemPrompt: `You are ${form.nameKo}. ${desc}. Provide expert analysis from your perspective. Respond in Korean. Engage with other experts' opinions.`,
      }]);
    }
    resetForm();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = experts.findIndex(e => e.id === active.id);
      const newIndex = experts.findIndex(e => e.id === over.id);
      onUpdate(arrayMove(experts, oldIndex, newIndex));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 text-xs">
          <Settings className="w-4 h-4" /> 토론자 관리
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">토론자 관리</DialogTitle>
          <p className="text-xs text-muted-foreground">드래그하여 순서를 변경하세요</p>
        </DialogHeader>

        {!isAdding ? (
          <div className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={experts.map(e => e.id)} strategy={verticalListSortingStrategy}>
                {experts.map(expert => (
                  <SortableExpertItem key={expert.id} expert={expert}
                    onEdit={() => startEdit(expert)}
                    onDelete={() => onUpdate(experts.filter(e => e.id !== expert.id))}
                    canDelete={experts.length > 2}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Button onClick={startAdd} variant="outline" className="w-full gap-2 mt-3" disabled={experts.length >= 12}>
              <Plus className="w-4 h-4" /> 전문가 추가 ({experts.length}/12)
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input value={form.nameKo} onChange={e => setForm(f => ({ ...f, nameKo: e.target.value }))} placeholder="예: 워렌 버핏, 찰리 멍거" />
            </div>
            <div className="space-y-2">
              <Label>아이콘 (이모지)</Label>
              <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="예: 🎩" className="text-center text-xl" maxLength={4} />
            </div>
            <div className="space-y-2">
              <Label>전문 분야</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="예: 가치투자 전문가, 거시경제 전문가" />
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <div className="flex gap-1.5">
                {(['ai', 'specialist', 'occupation', 'celebrity'] as ExpertCategory[]).map(cat => (
                  <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className={cn('px-3 py-1 rounded-lg border text-xs transition-all',
                      form.category === cat ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-muted-foreground'
                    )}>
                    {EXPERT_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex flex-wrap gap-1.5">
                {EXPERT_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all',
                      form.color === c ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-muted-foreground'
                    )}>
                    <div className={cn('w-2 h-2 rounded-full', colorDotClasses[c])} />
                    {EXPERT_COLOR_LABELS[c]}
                  </button>
                ))}
              </div>
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
