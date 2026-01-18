import React, { useEffect, useState } from 'react';
import { useEventLiveCycle } from '../hooks/useEventLiveCycle';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { Home, Clock, List, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';

export default function StagePage() {
    const [event, setEvent] = useState(null);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [flashMessage, setFlashMessage] = useState(null);

    // 1. Fetch the active event
    useEffect(() => {
        async function fetchEvent() {
            // Priority 1: Is there a playing event?
            let { data: playingEvent } = await supabase
                .from('events')
                .select('*')
                .eq('status', 'PLAYING')
                .limit(1)
                .single();

            if (playingEvent) {
                setEvent(playingEvent);
            } else {
                // Priority 2: Next upcoming event
                const now = new Date().toISOString();
                const { data: nextEvent } = await supabase
                    .from('events')
                    .select('*')
                    .gte('date', now)
                    .order('date', { ascending: true })
                    .limit(1)
                    .single();

                if (nextEvent) setEvent(nextEvent);
            }
            setLoading(false);
        }

        fetchEvent();
    }, []);

    // 2. Fetch Sections (for Stats & Display)
    useEffect(() => {
        if (!event?.id) return;

        async function fetchSections() {
            const { data } = await supabase
                .from('sections')
                .select('*')
                .eq('event_id', event.id)
                .order('order_index');

            if (data) setSections(data);
        }
        fetchSections();
    }, [event?.id, event?.sections]); // Reload if sections change (unplanned added)

    // 3. Discovery & Sync Subscription
    useEffect(() => {
        const discoveryChannel = supabase
            .channel('global-stage-discovery')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'events', filter: 'status=eq.PLAYING' },
                (payload) => setEvent(payload.new)
            )
            .subscribe();

        if (event?.id) {
            const syncChannel = supabase
                .channel('stage-event-sync')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` }, (payload) => {
                    setEvent(prev => ({ ...prev, ...payload.new }));
                })
                .subscribe();

            // Also listen for NEW sections (Unplanned)
            const sectionsChannel = supabase
                .channel('stage-sections-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sections', filter: `event_id=eq.${event.id}` }, () => {
                    // Just reload sections
                    async function reload() {
                        const { data } = await supabase.from('sections').select('*').eq('event_id', event.id).order('order_index');
                        if (data) setSections(data);
                    }
                    reload();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(discoveryChannel);
                supabase.removeChannel(syncChannel);
                supabase.removeChannel(sectionsChannel);
            };
        }

        return () => {
            supabase.removeChannel(discoveryChannel);
        };
    }, [event?.id]);

    // 4. Flash Message Logic (Direct from DB)
    // We removed the expiration Interval. We just trust the DB state.
    // UseEffect to sync removed. We just render event.stage_message.

    // 5. Timer Hook
    const currentSectionIndex = event?.current_section_index || 0;
    // Find section by order index if possible, else fallback to array index
    const activeSection = sections.length > 0 ? (sections.find(s => s.order_index === (sections.length > currentSectionIndex ? sections[currentSectionIndex].order_index : -1)) || sections[currentSectionIndex]) : null;

    const { formattedTime, isOvertime } = useEventLiveCycle(
        event,
        activeSection?.duration ?? 300,
        activeSection?.is_unplanned // Enable CountUp mode
    );

    if (loading) return <div className="min-h-screen bg-black" />;
    if (!event) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono">OFFLINE</div>;

    // --- FINISHED VIEW (STATS) ---
    if (event.status === 'FINISHED') {
        const plannedDuration = sections.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const actualDuration = sections.reduce((acc, curr) => acc + (curr.actual_duration || 0), 0);

        const unplannedCount = sections.filter(s => s.is_unplanned).length;
        const diff = actualDuration - plannedDuration;
        const isBetter = diff <= 0;

        const formatDur = (secs) => {
            const h = Math.floor(Math.abs(secs) / 3600);
            const m = Math.floor((Math.abs(secs) % 3600) / 60);
            return `${h}h ${m}m`;
        };

        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 overflow-y-auto">
                <Link to="/" className="absolute top-4 left-4 text-gray-800 opacity-0 hover:opacity-50 transition-opacity z-50">
                    <Home size={32} />
                </Link>

                <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest text-[#4F46E5] mb-2 animate-fade-in-up">
                    CULTE TERMINÉ
                </h1>

                {/* Performance Message */}
                <div className={`text-2xl font-bold mb-8 flex items-center gap-3 px-6 py-2 rounded-full ${isBetter ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {isBetter ? <CheckCircle /> : <AlertTriangle />}
                    {isBetter ? "Excellent Timing !" : `Débordement de ${Math.floor(diff / 60)} min`}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm">
                        <Clock size={32} className="text-gray-500 mb-2" />
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">DURÉE PRÉVUE</div>
                        <div className="text-4xl font-mono font-bold text-gray-300">
                            {formatDur(plannedDuration)}
                        </div>
                    </div>

                    <div className={`bg-gray-900/50 border p-6 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm ${isBetter ? 'border-green-900' : 'border-red-900'}`}>
                        <TrendingUp size={32} className={isBetter ? "text-green-500 mb-2" : "text-red-500 mb-2"} />
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">DURÉE RÉELLE</div>
                        <div className={`text-5xl font-mono font-bold ${isBetter ? 'text-green-400' : 'text-red-400 underline decoration-red-900/50'}`}>
                            {formatDur(actualDuration)}
                        </div>
                    </div>

                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm">
                        <List size={32} className="text-gray-500 mb-2" />
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">IMPRÉVUS</div>
                        <div className="text-4xl font-mono font-bold text-white">
                            {unplannedCount}
                        </div>
                    </div>
                </div>

                {/* Section Breakdown Table */}
                <div className="mt-8 w-full max-w-5xl border border-gray-800 rounded-2xl overflow-hidden bg-gray-900/30">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="bg-gray-800/50 text-gray-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4">Section</th>
                                <th className="p-4 text-right">Prévu</th>
                                <th className="p-4 text-right">Réel</th>
                                <th className="p-4 text-right">Écart</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {sections.map((s, idx) => {
                                const delta = (s.actual_duration || 0) - s.duration;
                                // Simple helper to format delta
                                const formatDelta = (d) => {
                                    const m = Math.floor(Math.abs(d) / 60);
                                    return `${d > 0 ? '+' : ''}${d < 0 ? '-' : ''}${m}m`;
                                };

                                return (
                                    <tr key={idx} className={`hover:bg-white/5 ${s.is_unplanned ? 'bg-purple-900/10' : ''}`}>
                                        <td className="p-4 font-medium text-gray-300">
                                            {s.title}
                                            {s.is_unplanned && <span className="ml-2 text-[10px] bg-purple-900 text-purple-200 px-2 py-0.5 rounded">IMPRÉVU</span>}
                                        </td>
                                        <td className="p-4 text-right">{Math.floor(s.duration / 60)}m</td>
                                        <td className="p-4 text-right">{s.actual_duration ? Math.floor(s.actual_duration / 60) + 'm' : '-'}</td>
                                        <td className={`p-4 text-right font-bold ${delta > 60 ? 'text-red-500' : 'text-green-500'}`}>
                                            {formatDelta(delta)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center overflow-hidden cursor-none relative group transition-colors duration-500 ${isOvertime ? 'bg-red-950' : 'bg-black'}`}>
            <Link to="/" className="absolute top-4 left-4 text-gray-800 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity z-50">
                <Home size={32} />
            </Link>

            {/* Flash Message Overlay */}
            {event?.stage_message && (
                <div className="absolute inset-0 z-[100] bg-black flex items-center justify-center p-8">
                    {/* HUGE TEXT */}
                    <h2 className="font-bold text-yellow-400 text-center uppercase tracking-tighter leading-none drop-shadow-[0_0_35px_rgba(250,204,21,0.5)]" style={{ fontSize: '15vw' }}>
                        {event.stage_message}
                    </h2>
                </div>
            )}

            {/* Top Status Headers */}
            <div className="absolute top-0 w-full flex flex-col items-center">
                {isOvertime && (
                    <div className="w-full bg-red-600 text-white text-center text-4xl font-bold py-4 uppercase tracking-[1em] animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.8)]">
                        DÉBORDEMENT
                    </div>
                )}
                {activeSection?.is_unplanned && (
                    <div className="mt-4 bg-purple-600 text-white px-8 py-2 rounded-full text-2xl font-bold uppercase tracking-widest shadow-lg border border-purple-400 animate-bounce-slight">
                        IMPRÉVU
                    </div>
                )}
            </div>

            <div className={`font-mono font-bold text-[30vw] leading-none transition-colors duration-200 z-10 ${isOvertime ? 'text-white' : 'text-white'}`}>
                {formattedTime}
            </div>

            <div className="absolute bottom-10 left-0 right-0 text-center opacity-0 group-hover:opacity-30 transition-opacity">
                <h2 className="text-white text-2xl font-bold tracking-widest uppercase">{event.title}</h2>
            </div>
        </div>
    );
}
