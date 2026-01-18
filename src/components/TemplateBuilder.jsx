import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../lib/supabaseClient';
import { GripVertical, Trash2, Plus, Save, ArrowLeft, LayoutTemplate, Clock } from 'lucide-react';

// --- Sortable Item ---
function SortableItem({ id, item, listeners, attributes, setNodeRef, transform, transition, isDragging, onUpdate, onDelete }) {

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="grid grid-cols-12 gap-4 items-center bg-white p-3 rounded-lg border border-gray-100 hover:border-gray-200 group transition-all mb-2">

            {/* Grip */}
            <div className="col-span-1 flex items-center justify-center">
                <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500">
                    <GripVertical size={18} />
                </div>
            </div>

            {/* Title */}
            <div className="col-span-6">
                <input
                    type="text"
                    value={item.title}
                    onChange={(e) => onUpdate(id, 'title', e.target.value)}
                    className="w-full text-gray-900 font-medium bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400"
                    placeholder="Titre de la section..."
                />
            </div>

            {/* Type */}
            <div className="col-span-3">
                <select
                    value={item.type}
                    onChange={(e) => onUpdate(id, 'type', e.target.value)}
                    className="w-full text-xs font-bold text-gray-500 bg-gray-50 border-none rounded focus:ring-0 cursor-pointer"
                >
                    <option value="GENERIC">Générique</option>
                    <option value="SONG">Chant</option>
                    <option value="SPEECH">Prédication</option>
                    <option value="VIDEO">Vidéo</option>
                </select>
            </div>

            {/* Duration */}
            <div className="col-span-1">
                <div className="relative">
                    <input
                        type="number"
                        value={Math.round(item.duration / 60)}
                        onChange={(e) => onUpdate(id, 'duration', parseInt(e.target.value) * 60)}
                        className="w-full text-center text-sm font-bold bg-gray-50 border-gray-200 rounded-lg focus:ring-orange-500 py-1.5 pr-4"
                    />
                    <span className="absolute right-1 top-1.5 text-xs text-gray-400 font-bold">m</span>
                </div>
            </div>

            {/* Delete */}
            <div className="col-span-1 flex justify-end">
                <button
                    onClick={() => onDelete(id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}

// --- Template Builder ---
export default function TemplateBuilder({ templateId, onClose }) {
    const [template, setTemplate] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (templateId) fetchData();
    }, [templateId]);

    async function fetchData() {
        setLoading(true);
        // 1. Template
        const { data: tmpl } = await supabase.from('templates').select('*').eq('id', templateId).single();
        // 2. Items
        const { data: itms } = await supabase.from('template_items').select('*').eq('template_id', templateId).order('order_index');

        if (tmpl) setTemplate(tmpl);
        if (itms) setItems(itms);
        setLoading(false);
    }

    async function handleUpdateTemplate(field, value) {
        setTemplate(prev => ({ ...prev, [field]: value }));
        await supabase.from('templates').update({ [field]: value }).eq('id', templateId);
    }

    async function addItem() {
        const newIndex = items.length;
        const { data } = await supabase.from('template_items').insert([{
            template_id: templateId,
            title: '',
            duration: 300,
            type: 'GENERIC',
            order_index: newIndex
        }]).select();

        if (data) setItems([...items, data[0]]);
    }

    async function deleteItem(id) {
        setItems(items.filter(i => i.id !== id));
        await supabase.from('template_items').delete().eq('id', id);
    }

    function updateItemLocal(id, field, value) {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    }

    async function saveChanges() {
        for (const [index, item] of items.entries()) {
            await supabase.from('template_items').update({
                order_index: index,
                title: item.title,
                duration: item.duration,
                type: item.type
            }).eq('id', item.id);
        }
        alert('Modifications enregistrées !');
    }

    function handleDragEnd(event) {
        const { active, over } = event;
        setActiveId(null);
        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    if (loading || !template) return <div className="p-10 text-center">Chargement...</div>;

    const totalDuration = items.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    return (
        <div className="fixed inset-0 bg-gray-50 overflow-y-auto z-50">
            {/* Nav */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-8 py-4 flex justify-between items-center shadow-sm">
                <button onClick={onClose} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium transition">
                    <ArrowLeft size={20} /> Retour Modèles
                </button>
                <button onClick={saveChanges} className="px-4 py-2 text-white bg-[#F59E0B] hover:bg-[#D97706] rounded-lg font-bold flex items-center gap-2 transition shadow-lg shadow-amber-100">
                    <Save size={18} /> Enregistrer
                </button>
            </div>

            <div className="max-w-4xl mx-auto p-8 space-y-6 pb-32">

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 text-[#F59E0B] mb-4">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <LayoutTemplate size={24} />
                        </div>
                        <h1 className="text-sm font-bold uppercase tracking-wider text-gray-400">Éditeur de Modèle</h1>
                    </div>

                    <div className="space-y-4">
                        <input
                            value={template.name}
                            onChange={(e) => handleUpdateTemplate('name', e.target.value)}
                            className="w-full text-3xl font-bold text-gray-900 border-none focus:ring-0 p-0 placeholder-gray-300"
                            placeholder="Nom du modèle..."
                        />
                        <textarea
                            value={template.description || ''}
                            onChange={(e) => handleUpdateTemplate('description', e.target.value)}
                            className="w-full text-gray-500 border-none focus:ring-0 p-0 resize-none h-auto"
                            placeholder="Ajoutez une description..."
                            rows={2}
                        />
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6 pl-2 pr-4">
                        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                            <Clock size={14} /> Total: {Math.floor(totalDuration / 60)} min
                        </div>
                        <div className="text-sm font-medium text-gray-400">{items.length} Éléments</div>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={({ active }) => setActiveId(active.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {items.map((item) => (
                                    <SortableItem
                                        key={item.id}
                                        id={item.id}
                                        item={item}
                                        listeners={undefined}
                                        onUpdate={updateItemLocal}
                                        onDelete={deleteItem}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                        <DragOverlay>
                            {activeId ? (
                                <div className="bg-white p-4 shadow-2xl rounded-lg border-2 border-orange-500 opacity-90">
                                    Item...
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                        <button
                            onClick={addItem}
                            className="flex items-center gap-2 text-[#F59E0B] hover:text-[#D97706] font-bold bg-orange-50 hover:bg-orange-100 px-6 py-3 rounded-full transition"
                        >
                            <Plus size={18} /> Ajouter une section
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
