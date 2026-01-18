
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log("Checking 'events' table...");
    const { data: events, error: err1 } = await supabase.from('events').select('*').limit(1);

    if (err1) console.error("Error fetching events:", err1);
    else if (events && events.length > 0) {
        const ev = events[0];
        console.log("Events columns:", Object.keys(ev));
        console.log("Has 'stage_message'?", 'stage_message' in ev);
        console.log("Has 'stage_message_expires_at'?", 'stage_message_expires_at' in ev);
    } else {
        console.log("No events found to check columns.");
    }

    console.log("\nChecking 'sections' table...");
    const { data: sections, error: err2 } = await supabase.from('sections').select('*').limit(1);

    if (err2) console.error("Error fetching sections:", err2);
    else if (sections && sections.length > 0) {
        const sec = sections[0];
        console.log("Sections columns:", Object.keys(sec));
        console.log("Has 'is_unplanned'?", 'is_unplanned' in sec);
        console.log("Has 'actual_duration'?", 'actual_duration' in sec);
    } else {
        console.log("No sections found to check columns.");
    }
}

checkSchema();
