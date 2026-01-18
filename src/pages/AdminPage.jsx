import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    Plus, Calendar, Trash2, Home, Play, Users, LayoutTemplate,
    BarChart3, Clock, MoreHorizontal, Edit, Tablet
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ServiceBuilder from '../components/ServiceBuilder';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard';
import StatsCard from '../components/StatsCard';
import LiveCard from '../components/LiveCard';

export default function AdminPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [viewStatsEventId, setViewStatsEventId] = useState(null);
    const [members, setMembers] = useState([]);

    // Fetch Events & Templates
    useEffect(() => {
        fetchEvents();
        fetchTemplates();
        fetchMembers();

        // Initialize date to Now + 5 minutes (Local Time)
        const d = new Date(Date.now() + 5 * 60 * 1000);
        // Adjust for timezone offset to get correct string for datetime-local input
        const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setNewDate(localIso);
    }, []);

    async function fetchTemplates() {
        const { data } = await supabase.from('templates').select('*').order('name');
        if (data) setTemplates(data);
    }

    async function fetchMembers() {
        const { data } = await supabase.from('members').select('*');
        if (data) setMembers(data);
    }

    async function fetchEvents() {
        const { data, error } = await supabase
            .from('events')
            .select('*, sections ( duration, actual_duration, member_id, type )')
            .order('date', { ascending: false });

        if (error) {
            console.error("Error fetching events:", error);
        } else if (data) {
            setEvents(data);
        }
        setLoading(false);
    }

    // derived state for next event
    const nextEvent = events
        .filter(e => new Date(e.date) > new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    // Helper to open modal with fresh date
    function openCreateModal() {
        const d = new Date(Date.now() + 5 * 60 * 1000);
        const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setNewDate(localIso);
        setIsCreating(true);
    }

    // Create Event
    async function createEvent(e) {
        e.preventDefault();
        if (!newTitle.trim() || !newDate) return;

        // 1. Create Event
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .insert([{
                title: newTitle,
                date: new Date(newDate).toISOString(),
                status: 'PLANNED'
            }])
            .select() // Important: get the ID back
            .single();

        if (eventError) {
            alert("Erreur lors de la création : " + eventError.message);
            return;
        }

        // 2. If Template Selected, Copy Items
        if (selectedTemplateId && eventData) {
            const { data: templateItems } = await supabase
                .from('template_items')
                .select('*')
                .eq('template_id', selectedTemplateId);

            if (templateItems && templateItems.length > 0) {
                const newSections = templateItems.map(item => ({
                    event_id: eventData.id,
                    title: item.title,
                    duration: item.duration,
                    type: item.type,
                    order_index: item.order_index
                }));

                await supabase.from('sections').insert(newSections);
            }
        }

        fetchEvents();
        setSelectedEventId(eventData.id); // Auto-open the editor
        setIsCreating(false);
        setNewTitle('');
        setSelectedTemplateId('');
    }

    async function deleteEvent(id) {
        if (!confirm("Supprimer ce culte ?")) return;
        await supabase.from('events').delete().eq('id', id);
        fetchEvents();
    }

    // Stats Modal Helper
    const statsEvent = events.find(e => e.id === viewStatsEventId);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Top Navigation */}
            <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2 text-[#4F46E5] font-bold text-xl">
                        <div className="bg-[#4F46E5] text-white p-1 rounded-md">C</div>
                        Church Event Manager
                    </Link>
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
                        <Link to="/admin" className="flex items-center gap-2 text-gray-900 bg-gray-100 px-3 py-1.5 rounded-full">
                            <Home size={16} /> Accueil
                        </Link>
                        <Link to="/templates" className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"><LayoutTemplate size={16} /> Modèles</Link>
                        <Link to="/activities" className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"><BarChart3 size={16} /> Activités</Link>
                        <Link to="/members" className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"><Users size={16} /> Intervenants</Link>
                    </div>
                </div>
                <Link to="/tablet" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                    <Tablet size={16} />
                    Mode Tablette
                </Link>
            </nav>

            <div className="max-w-7xl mx-auto p-8 space-y-12">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Church Event Manager</h1>
                    <p className="text-gray-500 mt-1">Gestion et pilotage d'événement</p>
                </div>

                {/* Hero Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Create Card */}
                    <DashboardCard
                        title="Créer un Événement"
                        icon={Plus}
                        description="Planifier un nouvel événement depuis zéro ou à partir d'un modèle."
                        accentColor="bg-[#4F46E5]"
                        onClick={openCreateModal}
                    />

                    {/* Live Card */}
                    <LiveCard nextEvent={nextEvent} />
                </div>

                {/* COMPUTED STATS */}
                {(() => {
                    const finishedEvents = events.filter(e => e.status === 'FINISHED');
                    const onTimeCount = finishedEvents.filter(e => {
                        const totalPlanned = e.sections?.reduce((acc, s) => acc + (s.duration || 0), 0) || 0;
                        const totalActual = e.sections?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0;
                        // Tolerance of 2 mins (120s) maybe? Or strict? User said "terminé à temps".
                        // Strict: actual <= planned.
                        return totalActual <= totalPlanned;
                    }).length;

                    const onTimeRatio = finishedEvents.length > 0
                        ? `${onTimeCount} / ${finishedEvents.length}`
                        : "0 / 0";

                    // Speakers Stats
                    const speakerCounts = {};
                    events.forEach(e => {
                        e.sections?.forEach(s => {
                            if (s.member_id) {
                                speakerCounts[s.member_id] = (speakerCounts[s.member_id] || 0) + 1;
                            }
                        });
                    });
                    const topSpeakers = Object.entries(speakerCounts)
                        .map(([id, count]) => {
                            const m = members.find(m => m.id === id);
                            return { name: m?.full_name || 'Inconnu', count };
                        })
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);

                    // Activity Stats (Avg Duration maybe? Or Count? User said "statistique du temps par sections")
                    // Let's do Total Time per Type
                    const typeTimes = {};
                    events.forEach(e => {
                        e.sections?.forEach(s => {
                            if (s.type && s.actual_duration) {
                                typeTimes[s.type] = (typeTimes[s.type] || 0) + s.actual_duration;
                            }
                        });
                    });
                    // Sort by duration desc
                    const topActivities = Object.entries(typeTimes)
                        .map(([type, duration]) => ({ type, duration }))
                        .sort((a, b) => b.duration - a.duration)
                        .slice(0, 5);


                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Stats Section */}
                            <div className="col-span-1 md:col-span-2">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <span className="text-[#4F46E5]"><BarChart3 size={24} /></span>
                                    Statistiques Globales
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <StatsCard
                                        icon={Users} // Using generic icon
                                        value={onTimeRatio}
                                        label="Cultes à l'heure"
                                        subtext="Sur le total terminé"
                                        color="text-green-600"
                                        bgColor="bg-green-50"
                                    />

                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[160px]">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20} /></div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOP INTERVENANTS</span>
                                        </div>
                                        <ul className="space-y-3">
                                            {topSpeakers.length > 0 ? topSpeakers.map((s, i) => (
                                                <li key={i} className="flex justify-between text-sm">
                                                    <span className="font-medium text-gray-700">{s.name}</span>
                                                    <span className="bg-purple-100 text-purple-800 px-2 rounded text-xs font-bold">{s.count}</span>
                                                </li>
                                            )) : <li className="text-gray-400 text-sm">Aucune donnée</li>}
                                        </ul>
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[160px]">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20} /></div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TEMPS PAR TYPE</span>
                                        </div>
                                        <ul className="space-y-3">
                                            {topActivities.length > 0 ? topActivities.map((a, i) => (
                                                <li key={i} className="flex justify-between text-sm">
                                                    <span className="font-medium text-gray-700">{a.type}</span>
                                                    <span className="bg-amber-100 text-amber-800 px-2 rounded text-xs font-bold">{Math.round(a.duration / 60)} min</span>
                                                </li>
                                            )) : <li className="text-gray-400 text-sm">Aucune donnée</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Secondary Cards Grid (Moved down) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-8">
                    <DashboardCard
                        title="Intervenants"
                        icon={Users}
                        description="Gérer les pasteurs, leaders et équipes."
                        accentColor="bg-[#10B981]" // Green
                        className="border-none shadow-none bg-white"
                        to="/members"
                    />
                    <DashboardCard
                        title="Modèles d'Événement"
                        icon={LayoutTemplate}
                        description="Gérer les modèles types de cultes."
                        accentColor="bg-[#F59E0B]" // Orange
                        className="border-none shadow-none bg-white"
                        to="/templates"
                    />
                </div>


                {/* Event List Table */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="text-[#4F46E5]"><LayoutTemplate size={24} /></span>
                                Tous les Événements
                            </h2>
                        </div>
                        <button onClick={openCreateModal} className="text-[#4F46E5] font-medium text-sm flex items-center gap-1 hover:underline">
                            + Nouveau
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Chargement...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                        <th className="pb-4 pl-4">Date</th>
                                        <th className="pb-4">Thème</th>
                                        <th className="pb-4">Heure</th>
                                        <th className="pb-4">Durée</th>
                                        <th className="pb-4 text-right pr-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {events.slice(0, 3).map((event) => {
                                        const totalSeconds = event.sections?.reduce((acc, curr) => acc + (curr.duration || 0), 0) || 0;
                                        const hours = Math.floor(totalSeconds / 3600);
                                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                                        const isFinished = event.status === 'FINISHED';

                                        return (
                                            <tr key={event.id} className="group hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                                                <td className="py-6 pl-4 align-top w-24">
                                                    <div className={`flex flex-col items-center justify-center rounded-lg w-12 h-12 border transition
                                                        ${isFinished ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-200 group-hover:bg-white group-hover:border-gray-300'}
                                                    `}>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(event.date), 'MMM', { locale: fr })}.</span>
                                                        <span className="text-lg font-bold text-gray-900 leading-none">{format(new Date(event.date), 'dd')}</span>
                                                    </div>
                                                </td>
                                                <td className="py-6 align-middle">
                                                    <div className="font-bold text-gray-900 text-base mb-1">
                                                        {event.title}
                                                        {isFinished && <span className="ml-2 text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">Terminé</span>}
                                                    </div>
                                                    <div className="text-gray-400 text-xs">{event.sections?.length || 0} éléments</div>
                                                </td>
                                                <td className="py-6 align-middle text-gray-500">
                                                    {format(new Date(event.date), 'HH:mm')}
                                                </td>
                                                <td className="py-6 align-middle text-gray-500">
                                                    {hours}h {minutes}min
                                                </td>
                                                <td className="py-6 align-middle text-right pr-4">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isFinished ? (
                                                            <button
                                                                onClick={() => setViewStatsEventId(event.id)}
                                                                className="flex items-center gap-2 px-3 py-1.5 border border-purple-200 rounded-lg text-purple-600 hover:bg-purple-50 transition text-xs font-medium bg-white"
                                                            >
                                                                <BarChart3 size={14} /> Stats
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setSelectedEventId(event.id)}
                                                                className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-white hover:text-[#4F46E5] hover:border-[#4F46E5] transition text-xs font-medium bg-white"
                                                            >
                                                                <Edit size={14} /> Modifier
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => deleteEvent(event.id)}
                                                            className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition bg-white"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}

                                    {events.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="py-10 text-center text-gray-400 italic">Aucun événement trouvé.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Creation Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Nouveau Culte</h3>
                                <p className="text-gray-500 text-sm mt-1">Créez un nouvel événement pour votre église.</p>
                            </div>
                            <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={createEvent}>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'événement</label>
                                    <input
                                        className="w-full border border-gray-200 rounded-xl p-3 text-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none transition shadow-sm"
                                        autoFocus
                                        placeholder="ex: Culte de Louange"
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date et Heure de début</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:ring-2 focus:ring-[#4F46E5] outline-none bg-white"
                                        value={newDate}
                                        onChange={e => setNewDate(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Modèle (Optionnel)</label>
                                    <select
                                        className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:ring-2 focus:ring-[#4F46E5] outline-none bg-white"
                                        value={selectedTemplateId}
                                        onChange={e => setSelectedTemplateId(e.target.value)}
                                    >
                                        <option value="">Aucun (Vide)</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition">Annuler</button>
                                <button type="submit" className="px-6 py-3 bg-[#4F46E5] text-white rounded-xl hover:bg-[#4338ca] font-medium shadow-lg shadow-indigo-200 transition">Créer l'événement</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Editor Modal */}
            {selectedEventId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
                        <ServiceBuilder
                            eventId={selectedEventId}
                            onClose={() => {
                                setSelectedEventId(null);
                                fetchEvents();
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            {viewStatsEventId && statsEvent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{statsEvent.title}</h3>
                                <p className="text-gray-500 text-sm">{format(new Date(statsEvent.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                            </div>
                            <button onClick={() => setViewStatsEventId(null)} className="p-2 hover:bg-gray-100 rounded-full transition"><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <div className="text-purple-600 text-xs font-bold uppercase tracking-wide mb-1">Durée Prévue</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {Math.floor((statsEvent.sections?.reduce((a, b) => a + (b.duration || 0), 0) || 0) / 3600)}h {Math.floor(((statsEvent.sections?.reduce((a, b) => a + (b.duration || 0), 0) || 0) % 3600) / 60)}min
                                </div>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <div className="text-green-600 text-xs font-bold uppercase tracking-wide mb-1">Sections</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {statsEvent.sections?.length || 0}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Détail du déroulé</h4>
                            <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="p-3 pl-4">Section</th>
                                            <th className="p-3 text-right pr-4">Durée</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {statsEvent.sections?.sort((a, b) => a.order_index - b.order_index).map((s, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 pl-4 font-medium text-gray-700">{s.title}</td>
                                                <td className="p-3 text-right pr-4 text-gray-500">{Math.floor(s.duration / 60)}m {s.duration % 60}s</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setViewStatsEventId(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
