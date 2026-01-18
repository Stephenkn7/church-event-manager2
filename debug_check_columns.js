
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
    // Select one section and see what keys it returns
    const { data: sections, error } = await supabase
        .from('sections')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        if (sections.length > 0) {
            console.log("Section Columns:", Object.keys(sections[0]));
        } else {
            console.log("No sections found to inspect.");
        }
    }
}

checkColumns();
