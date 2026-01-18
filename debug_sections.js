
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkLatestEventSections() {
    // Get latest event
    const { data: events, error: err1 } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (err1 || !events || events.length === 0) {
        console.error("No events found or error:", err1);
        return;
    }

    const event = events[0];
    console.log("Latest Event:", event.title);
    console.log("ID:", event.id);
    console.log("Status:", event.status);
    console.log("Current Index:", event.current_section_index);
    console.log("Timer Start:", event.section_timer_start);
    console.log("Initial Duration:", event.section_timer_initial_duration);
    console.log("Stage Msg:", event.stage_message);

    // Get sections
    const { data: sections, error: err2 } = await supabase
        .from('sections')
        .select('*')
        .eq('event_id', event.id)
        .order('order_index');

    if (err2) {
        console.error("Error fetching sections:", err2);
        return;
    }

    console.log("Sections:");
    sections.forEach(s => {
        console.log(`- [${s.order_index}] ${s.title} | Duration: ${s.duration} | Type: ${s.type} | IsUnplanned: ${s.is_unplanned}`);
    });
}

checkLatestEventSections();
