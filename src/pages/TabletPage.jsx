import React, { useEffect, useState } from 'react';
import { useEventLiveCycle } from '../hooks/useEventLiveCycle';
import { supabase } from '../lib/supabaseClient';
import { Play, Pause, SkipForward, Loader2, Home, Plus, MessageSquare, AlertTriangle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TabletPage() {
    const [event, setEvent] = useState(null);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Features State
    const [showUnplannedModal, setShowUnplannedModal] = useState(false);
    const [unplannedTitle, setUnplannedTitle] = useState('');
    const [flashMessage, setFlashMessage] = useState('');
    const [isSendingMsg, setIsSendingMsg] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Fetch Event & Sections
    useEffect(() => {
        async function fetchEventData() {
            setLoading(true);
            const searchParams = new URLSearchParams(window.location.search);
            const eventId = searchParams.get('eventId');

            let eventQuery = supabase.from('events').select('*');

            if (eventId) {
                eventQuery = eventQuery.eq('id', eventId).single();
            } else {
                // Priority: PLAYING > PLANNED (future) > PLANNED (past/any)
                const { data: playingEvent } = await supabase
                    .from('events')
                    .select('*')
                    .eq('status', 'PLAYING')
                    .single();

                if (playingEvent) {
                    eventQuery = null;
                    setEvent(playingEvent);
                    setCurrentIndex(playingEvent.current_section_index || 0);
                    fetchSections(playingEvent.id);
                    return;
                }

                // If no playing event, get next future one
                const now = new Date().toISOString();
                eventQuery = eventQuery
                    .gte('date', now)
                    .order('date', { ascending: true })
                    .limit(1)
                    .single();
            }

            if (eventQuery) {
                const { data, error } = await eventQuery;
                if (data) {
                    setEvent(data);
                    setCurrentIndex(data.current_section_index || 0);
                    fetchSections(data.id);
                } else {
                    // Fallback to *any* last event
                    const { data: lastEvent } = await supabase
                        .from('events')
                        .select('*')
                        .order('date', { ascending: false })
                        .limit(1)
                        .single();
                    if (lastEvent) {
                        setEvent(lastEvent);
                        setCurrentIndex(lastEvent.current_section_index || 0);
                        fetchSections(lastEvent.id);
                    }
                }
            }
            setLoading(false);
        }

        fetchEventData();
    }, []);

    async function fetchSections(eventId) {
        const { data } = await supabase
            .from('sections')
            .select('*')
            .eq('event_id', eventId)
            .order('order_index', { ascending: true });

        if (data) {
            setSections(data);
        }
        setLoading(false);
    }

    // 2. Realtime Subscription (Syncs event state for the Hook)
    useEffect(() => {
        if (!event?.id) return;

        const channel = supabase
            .channel('tablet-event-updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` },
                (payload) => {
                    const updated = payload.new;
                    setEvent(prev => ({ ...prev, ...updated }));
                    if (updated.current_section_index !== undefined) {
                        setCurrentIndex(updated.current_section_index);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [event?.id]);


    // 3. Timer Hook
    const currentSection = sections[currentIndex];
    const { formattedTime, status, timeLeft, isOvertime } = useEventLiveCycle(
        event,
        currentSection?.duration ?? 300,
        currentSection?.is_unplanned // Enable CountUp mode for unplanned
    );

    // 4. Handlers
    const handleGo = async () => {
        if (!event) return;

        const now = new Date().toISOString();
        let updates = {};

        if (status === 'PLAYING') {
            // PAUSE
            updates = {
                status: 'PAUSED',
                section_timer_start: null,
                section_timer_initial_duration: timeLeft
            };
        } else {
            // PLAY
            const isRestart = event.status === 'FINISHED' || status === 'FINISHED';
            let durationToSet = timeLeft;

            if (status === 'PLANNED' || isRestart) {
                if (isRestart) {
                    updates.current_section_index = 0;
                    setCurrentIndex(0);
                    durationToSet = sections[0]?.duration ?? 300;
                } else {
                    durationToSet = sections[currentIndex]?.duration ?? 300;
                }
            }

            updates = {
                ...updates,
                status: 'PLAYING',
                section_timer_start: now,
                section_timer_initial_duration: durationToSet
            };
        }

        setEvent(prev => ({ ...prev, ...updates }));
        await supabase.from('events').update(updates).eq('id', event.id);
    };


    const handleNext = async () => {
        const nextIndex = currentIndex + 1;

        // Log Actual Duration for the CURRENT section
        // Formula: PlannedDuration - RemainingTime
        // If overtime (e.g. -60s), duration - (-60) = duration + 60. Correct.
        if (currentSection) {
            const timeSpent = (currentSection.duration || 0) - timeLeft;
            await supabase
                .from('sections')
                .update({ actual_duration: timeSpent })
                .eq('id', currentSection.id);
        }

        // Check End
        if (currentIndex >= sections.length - 1) {
            if (confirm("Terminer le culte ?")) {
                const updates = {
                    status: 'FINISHED',
                    section_timer_start: null,
                    // Clear message
                    stage_message: null
                };
                setEvent(prev => ({ ...prev, ...updates }));
                await supabase.from('events').update(updates).eq('id', event.id);
                alert("Culte terminé !");
                window.location.href = '/admin';
            }
            return;
        }

        // Move Next
        const nextSection = sections[nextIndex];
        const now = new Date().toISOString();

        const updates = {
            current_section_index: nextIndex,
            status: 'PLAYING',
            section_timer_start: now,
            section_timer_initial_duration: nextSection?.duration ?? 300
        };

        setCurrentIndex(nextIndex);
        setEvent(prev => ({ ...prev, ...updates }));

        await supabase.from('events').update(updates).eq('id', event.id);
    };

    // Add Unplanned Section
    const handleAddUnplanned = async () => {
        if (!unplannedTitle.trim()) return;
        setLoading(true);

        const newOrderIndex = currentSection ? currentSection.order_index + 1 : 1;

        // 1. Shift subsequent sections down
        // Note: Simple loop for now. Ideally RPC for atomicity but this works for small sets.
        const sectionsToShift = sections.filter(s => s.order_index >= newOrderIndex);
        for (const s of sectionsToShift) {
            await supabase.from('sections').update({ order_index: s.order_index + 1 }).eq('id', s.id);
        }

        // 2. Insert new
        const { error } = await supabase.from('sections').insert([{
            event_id: event.id,
            title: unplannedTitle,
            duration: 0, // Starts at 0 counting up
            is_unplanned: true,
            order_index: newOrderIndex,
            type: 'unplanned'
        }]);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            setUnplannedTitle('');
            setShowUnplannedModal(false);
            await fetchSections(event.id); // Refresh
        }
        setLoading(false);
    };

    // Send Flash Message
    const handleSendFlash = async (e) => {
        e.preventDefault();
        if (!flashMessage.trim()) return;
        setIsSendingMsg(true);

        // No Expiration needed for manual removal
        // const expiresAt = new Date(Date.now() + 5000 + 1000).toISOString(); 

        await supabase.from('events').update({
            stage_message: flashMessage,
            stage_message_expires_at: null // Clear expiration to make it persistent
        }).eq('id', event.id);

        setFlashMessage('');
        setIsSendingMsg(false);
    };

    // Clear Flash Message
    const handleClearFlash = async () => {
        if (!confirm("Retirer le message de l'écran ?")) return;
        await supabase.from('events').update({
            stage_message: null,
            stage_message_expires_at: null
        }).eq('id', event.id);
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!event) return <div className="flex h-screen items-center justify-center">Aucun événement trouvé</div>;

    const isLastSection = sections.length > 0 && currentIndex >= sections.length - 1;

    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-500 ${isOvertime ? 'bg-red-50' : 'bg-gray-100'}`}>
            {/* Header */}
            <header className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-gray-500 hover:text-gray-900">
                        <Home size={24} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800 hidden md:block">TÉLÉCOMMANDE</h1>
                </div>

                {/* Flash Message Input */}
                <form onSubmit={handleSendFlash} className="flex-1 max-w-md mx-4 flex gap-2">
                    <input
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4F46E5] outline-none"
                        placeholder="Message écran..."
                        value={flashMessage}
                        onChange={e => setFlashMessage(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={isSendingMsg || !flashMessage.trim()}
                        className="bg-gray-800 text-white p-2 rounded-lg hover:bg-black disabled:opacity-50"
                        title="Envoyer"
                    >
                        <Send size={16} />
                    </button>
                    {/* Clear Button - Only show if there is an active message (optimistic check could be better but this works if we trust event state) */}
                    {event.stage_message && (
                        <button
                            type="button"
                            onClick={handleClearFlash}
                            className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 border border-red-200"
                            title="Retirer le message"
                        >
                            Retirer
                        </button>
                    )}
                </form>

                <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{event.title}</div>
                    <div className="text-xs text-gray-500 font-mono">
                        {sections.length > 0 ? `${currentIndex + 1} / ${sections.length}` : '-'}
                    </div>
                </div>
            </header>

            {/* Overtime Alert */}
            {isOvertime && (
                <div className="bg-red-600 text-white text-center py-2 font-bold uppercase tracking-widest animate-pulse">
                    ⚠️ DÉBORDEMENT
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 p-4 flex flex-col items-center justify-center space-y-8">

                {/* Timer Display */}
                <div className="flex flex-col items-center gap-2">
                    {currentSection?.is_unplanned && (
                        <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-bold tracking-widest border border-purple-200">
                            IMPRÉVU
                        </span>
                    )}
                    <h2 className="text-3xl font-bold text-gray-800 text-center max-w-2xl">
                        {currentSection?.title || 'Aucune section'}
                    </h2>
                    <div className={`text-9xl font-mono font-bold transition-colors duration-300 mt-4 ${isOvertime ? 'text-red-600' : 'text-gray-900'}`}>
                        {formattedTime}
                    </div>
                </div>

                <div className="text-xl text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${status === 'PLAYING' ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></span>
                    {status === 'PLANNED' ? 'PRÊT' : status}
                </div>

                {/* Controls */}
                <div className="w-full max-w-2xl grid grid-cols-2 gap-4">
                    <button
                        onClick={handleGo}
                        className={`col-span-1 h-32 flex flex-col items-center justify-center rounded-2xl text-white text-2xl font-bold transition-all shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                          ${status === 'PLAYING' ? 'bg-amber-500' : 'bg-green-600'}`}
                    >
                        {status === 'PLAYING' ? <Pause size={40} /> : <Play size={40} />}
                        <span className="mt-2 text-base">
                            {status === 'PLAYING' ? 'PAUSE' : 'GO LIVE'}
                        </span>
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={sections.length === 0}
                        className={`col-span-1 h-32 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg active:scale-95 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed
                                        ${isLastSection ? 'bg-red-600' : 'bg-indigo-600'}
                                    `}
                    >
                        {isLastSection ? <Home size={40} /> : <SkipForward size={40} />}
                        <span className="mt-2 text-base">{isLastSection ? 'TERMINER' : 'SUIVANT'}</span>
                    </button>

                    {/* Unplanned Button */}
                    <button
                        onClick={() => setShowUnplannedModal(true)}
                        className="col-span-2 py-4 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        Ajouter un Imprévu
                    </button>

                    {/* Next Section Preview */}
                    {!isLastSection && sections[currentIndex + 1] && (
                        <div className="col-span-2 text-center text-gray-400 text-sm mt-2">
                            À suivre : <span className="font-bold text-gray-600">{sections[currentIndex + 1].title}</span>
                        </div>
                    )}
                </div>

            </main>

            {/* Unplanned Modal */}
            {showUnplannedModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Ajouter un Imprévu</h3>
                        <input
                            autoFocus
                            className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Titre de l'imprévu..."
                            value={unplannedTitle}
                            onChange={e => setUnplannedTitle(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button disabled={isSubmitting} onClick={() => setShowUnplannedModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                            <button disabled={isSubmitting} onClick={handleAddUnplanned} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                                {isSubmitting ? 'Ajout...' : 'Ajouter & Insérer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
