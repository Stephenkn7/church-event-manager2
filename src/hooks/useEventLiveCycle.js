import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook to manage the live cycle of an event section with strict server-side synchronization.
 * @param {object|null} event - The full event object from DB (must include section_timer_start, etc).
 * @param {number} defaultDuration - The default duration of the current section (fallback).
 * @returns {object} - { formattedTime, status, timeLeft, isOvertime, setStatus, setTimeLeft }
 */
export function useEventLiveCycle(event, defaultDuration = 300, isCountUp = false) {
    // We treat the DB values as the source of truth.
    // Local state is just for the ticker.
    const [timeLeft, setTimeLeft] = useState(defaultDuration);
    const [isOvertime, setIsOvertime] = useState(false);

    // Derived from event, but we keep a local copy to handle rapid updates/optimistic UI if needed
    // However, for sync, we should rely heavily on the 'event' prop + realtime updates.
    const status = event?.status || 'PLANNED';
    const timerStart = event?.section_timer_start;
    let initialDuration = event?.section_timer_initial_duration ?? defaultDuration;

    // Fix: If DB has default 0 for PLANNED event, force usage of section duration
    if (status === 'PLANNED' && initialDuration === 0) {
        initialDuration = defaultDuration;
    }

    const timerRef = useRef(null);

    // Sync function: Calculates time based on Server Start Time
    const syncTimer = () => {
        if (!event) return;

        if (status === 'PLAYING' && timerStart) {
            const now = new Date().getTime();
            const startedAt = new Date(timerStart).getTime();
            const elapsedSeconds = Math.floor((now - startedAt) / 1000);
            const remaining = initialDuration - elapsedSeconds;

            setTimeLeft(remaining);
            setIsOvertime(isCountUp ? false : remaining < 0);
        } else if (status === 'PAUSED' || status === 'PLANNED' || status === 'FINISHED') {
            // Use the stored duration (which is remaining time for PAUSED, or full for PLANNED)
            // If DB has 0 or null, fall back to defaultDuration only if PLANNED?
            // Actually, if PAUSED, initialDuration IS the remaining time.
            setTimeLeft(initialDuration || defaultDuration);
            setIsOvertime(false);
        }
    };

    // 1. Effect: When event data changes (from Parent fetch or Realtime), sync immediately.
    useEffect(() => {
        syncTimer();
    }, [event, status, timerStart, initialDuration, defaultDuration]);

    // 2. Effect: The Ticker (Interval)
    // Only runs when PLAYING. It cheaply decrements or re-syncs.
    useEffect(() => {
        if (status === 'PLAYING') {
            timerRef.current = setInterval(() => {
                // We re-calculate from start time every tick to avoid drift
                syncTimer();
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [status, timerStart, initialDuration]);


    // Realtime Listener Setup is handled by the Page usually, 
    // BUT we can add a specific listener here if the passed 'event' object isn't live-updating.
    // Assuming the parent component updates the 'event' prop via its own subscription.
    // NOTE: TabletPage and StagePage ALREADY have subscriptions or fetch logic. 
    // We will rely on the parent to pass the updated 'event' object.

    // Formatting helper (MM:SS)
    const formatTime = (seconds) => {
        const absSeconds = Math.abs(seconds);
        const m = Math.floor(absSeconds / 60);
        const s = absSeconds % 60;
        const sign = seconds < 0 ? '-' : '';
        return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return {
        timeLeft,
        status,
        isOvertime,
        formattedTime: formatTime(timeLeft),
        // No local setStatus/setTimeLeft exposed anymore usually, 
        // as we want to force DB updates being the trigger. 
        // But for "optimistic" UI in TabletPage, we might kept them, 
        // though strictly they should trigger DB writes then updates come back.
    };
}
