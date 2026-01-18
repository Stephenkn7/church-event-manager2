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
import { GripVertical, Trash2, Plus, Save, Calendar, Clock, ArrowLeft, Play, List, X } from 'lucide-react';
import { format, addSeconds, addMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

// --- Sortable Section Item ---
// --- Sortable Section Item ---
// --- Sortable Section Item ---
function SortableItem({ id, section, onUpdate, onDelete, members, activities, startTime }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="grid grid-cols-12 gap-4 items-center bg-white p-3 rounded-lg border border-gray-100 hover:border-gray-200 group transition-all mb-2">

            {/* Grip & Time */}
            <div className="col-span-2 flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500">
                    <GripVertical size={18} />
                </div>
                <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold font-mono">
                    {startTime}
                </div>
            </div>

            {/* Activity Selector (Title) */}
            <div className="col-span-4">
                <select
                    value={activities?.find(a => a.title === section.title) ? section.title : 'custom'}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') return;
                        const activity = activities.find(a => a.title === val);
                        if (activity) {
                            // Update multiple fields at once
                            onUpdate(id, {
                                title: activity.title,
                                duration: activity.default_duration,
                                type: activity.type
                            });
                        }
                    }}
                    className="w-full text-gray-900 font-bold bg-transparent border-none focus:ring-0 p-0 text-lg cursor-pointer hover:bg-gray-50 rounded pl-2 -ml-2 transition"
                >
                    <option value="custom" disabled hidden>{section.title || "Sélectionner une activité..."}</option>
                    {activities?.map(a => (
                        <option key={a.id} value={a.title}>{a.title}</option>
                    ))}
                </select>
            </div>

            {/* Assignee (Member) */}
            <div className="col-span-4">
                <select
                    value={section.member_id || ""}
                    onChange={(e) => onUpdate(id, 'member_id', e.target.value)}
                    className="w-full text-sm text-gray-600 bg-gray-50 border-gray-200 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] py-1.5"
                >
                    <option value="">Sélectionner...</option>
                    {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                </select>
            </div>

            {/* Duration */}
            <div className="col-span-1">
                <div className="relative">
                    <input
                        type="number"
                        value={Math.round(section.duration / 60)}
                        onChange={(e) => onUpdate(id, 'duration', parseInt(e.target.value) * 60)} // Convert mins to seconds
                        className="w-full text-center text-sm font-bold bg-gray-50 border-gray-200 rounded-lg focus:ring-[#4F46E5] py-1.5 pr-6"
                    />
                    <span className="absolute right-2 top-1.5 text-xs text-gray-400 font-bold">m</span>
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

// --- Main Service Builder Component ---
export default function ServiceBuilder({ eventId, onClose }) {
    const [event, setEvent] = useState(null);
    const [sections, setSections] = useState([]);
    const [members, setMembers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Fetch All Data
    useEffect(() => {
        if (eventId) {
            fetchData();
        }
    }, [eventId]);

    async function fetchData() {
        setLoading(true);

        // 1. Fetch Event Details
        const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single();

        // 2. Fetch Sections
        const { data: sectionData } = await supabase.from('sections').select('*').eq('event_id', eventId).order('order_index');

        // 3. Fetch Members
        const { data: memberData } = await supabase.from('members').select('*').order('full_name');

        // 4. Fetch Activities
        const { data: activityData } = await supabase.from('activities').select('*').order('title');

        if (eventData) setEvent(eventData);
        if (sectionData) setSections(sectionData);
        if (memberData) setMembers(memberData);
        if (activityData) setActivities(activityData);

        setLoading(false);
    }

    // --- Actions ---

    async function handleUpdateEvent(field, value) {
        // Optimistic
        setEvent(prev => ({ ...prev, [field]: value }));
        // DB
        await supabase.from('events').update({ [field]: value }).eq('id', eventId);
    }

    async function addSection() {
        const newIndex = sections.length;
        const { data } = await supabase.from('sections').insert([{
            event_id: eventId,
            title: '',
            duration: 300, // 5 mins default
            type: 'GENERIC',
            order_index: newIndex
        }]).select();

        if (data) setSections([...sections, data[0]]);
    }

    async function deleteSection(id) {
        if (!confirm('Supprimer cette section ?')) return;
        setSections(sections.filter(s => s.id !== id));
        await supabase.from('sections').delete().eq('id', id);
    }

    function updateSectionLocal(id, fieldOrUpdates, value) {
        setSections(prev => prev.map(s => {
            if (s.id !== id) return s;
            if (typeof fieldOrUpdates === 'object') {
                return { ...s, ...fieldOrUpdates };
            }
            return { ...s, [fieldOrUpdates]: value };
        }));
    }

    // Debounced Save for Sections (or simple save button)
    // For now, let's keep the explicit save button for order, but auto-save content?
    // Let's stick to explicit save for dragging to avoid jumpiness, but auto-save content updates.

    // Auto-save section content updates (debounced in real app, simplified here)
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (sections.length > 0) {
                // In a real app we'd track dirty state to avoid spamming DB
                // For prototype, we can assume user clicks "Enregistrer" for big changes
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [sections]);

    async function saveChanges() {
        // Save Sections Order & Content
        for (const [index, section] of sections.entries()) {
            await supabase.from('sections').update({
                order_index: index,
                title: section.title,
                duration: section.duration,
                member_id: section.member_id
            }).eq('id', section.id);
        }
        alert('Modifications enregistrées !');
    }

    function handleDragEnd(event) {
        const { active, over } = event;
        setActiveId(null);

        if (active.id !== over.id) {
            setSections((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    // --- Calculations ---
    const totalDuration = sections.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const eventParams = event ? {
        start: new Date(event.date),
        endEstimated: addSeconds(new Date(event.date), totalDuration)
    } : { start: new Date(), endEstimated: new Date() };


    if (loading || !event) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4F46E5]"></div></div>;

    return (
        <div className="fixed inset-0 bg-gray-50 overflow-y-auto z-50">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-8 py-4 flex justify-between items-center shadow-sm">
                <button onClick={onClose} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium transition">
                    <ArrowLeft size={20} /> Retour Accueil
                </button>

                <div className="flex items-center gap-3">
                    <button onClick={saveChanges} className="px-4 py-2 text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium flex items-center gap-2 transition">
                        <Save size={18} /> Enregistrer
                    </button>
                    <button className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg font-medium flex items-center gap-2 transition">
                        📄 Bibliothèque
                    </button>
                    <button onClick={() => window.location.href = `/tablet?eventId=${eventId}`} className="px-4 py-2 bg-[#EF4444] text-white rounded-lg font-bold flex items-center gap-2 hover:bg-red-600 shadow-lg shadow-red-200 transition">
                        <Play size={18} fill="currentColor" /> GO LIVE
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-8 space-y-6 pb-32">

                {/* Event Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3 text-[#4F46E5]">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Calendar size={24} />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Éditeur de Culte</h1>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">DATE ET HEURE</span>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <input
                                    type="datetime-local"
                                    value={event.date ? new Date(event.date).toISOString().slice(0, 16) : ''}
                                    onChange={(e) => handleUpdateEvent('date', new Date(e.target.value).toISOString())}
                                    className="bg-transparent border-none focus:ring-0 p-0 font-medium text-gray-900 text-right cursor-pointer hover:bg-gray-50 rounded"
                                />
                                <Calendar size={16} className="text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-xs font-bold text-[#4F46E5] uppercase tracking-wider mb-2">THÈME</label>
                        <input
                            value={event.title}
                            onChange={(e) => handleUpdateEvent('title', e.target.value)}
                            className="w-full text-3xl font-bold text-gray-900 border-none focus:ring-0 p-0 placeholder-gray-300"
                            placeholder="Titre du culte..."
                        />
                    </div>

                    {/* Role fields removed as requested */}
                </div>

                {/* Program List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6 pl-2 pr-4">
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                            <Clock size={16} className="text-[#4F46E5]" />
                            <span className="text-sm font-bold text-gray-600">DÉBUT</span>
                            <span className="text-sm font-mono font-bold text-gray-900">{format(eventParams.start, 'HH:mm')}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-400">{sections.length} Éléments</div>
                    </div>

                    {/* Header Columns */}
                    <div className="grid grid-cols-12 gap-4 px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-2">Horaire</div>
                        <div className="col-span-4">Programme</div>
                        <div className="col-span-4">Intervenant</div>
                        <div className="col-span-2 text-center">Durée</div>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={({ active }) => setActiveId(active.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sections.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {sections.map((section, index) => {
                                    // Calculate start time for this section
                                    // Sum of durations of all previous sections
                                    const previousDuration = sections.slice(0, index).reduce((acc, curr) => acc + (curr.duration || 0), 0);
                                    const sectionStartTime = addSeconds(eventParams.start, previousDuration);

                                    return (
                                        <SortableItem
                                            key={section.id}
                                            id={section.id}
                                            section={section}
                                            startTime={format(sectionStartTime, 'HH:mm')}
                                            onUpdate={updateSectionLocal}
                                            onDelete={deleteSection}
                                            members={members}
                                            activities={activities}
                                        />
                                    );
                                })}
                            </div>
                        </SortableContext>
                        <DragOverlay>
                            {activeId ? (
                                <div className="bg-white p-4 shadow-2xl rounded-lg border-2 border-indigo-500 opacity-90">
                                    Item in motion...
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    {/* Footer Actions */}
                    <div className="mt-8 flex justify-between items-center border-t border-gray-100 pt-6">
                        <button className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-medium px-2 py-1 hover:bg-red-50 rounded-lg transition">
                            <Trash2 size={16} /> Supprimer le culte
                        </button>
                        <button
                            onClick={addSection}
                            className="flex items-center gap-2 text-[#4F46E5] hover:text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition"
                        >
                            <Plus size={18} /> Ajouter une section
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Sticky Stats */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-[#0F172A] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-12 z-50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DURÉE TOTALE</span>
                    <span className="text-xl font-bold font-mono">
                        {Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}min
                    </span>
                </div>
                <div className="w-px h-8 bg-gray-700"></div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">FIN ESTIMÉE</span>
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                        {format(eventParams.endEstimated, 'HH:mm')}
                    </span>
                </div>
            </div>
        </div>
    );
}

