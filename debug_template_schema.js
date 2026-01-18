
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTemplateCols() {
    const { data, error } = await supabase.from('template_items').select('*').limit(1);
    if (error) console.error(error);
    else if (data.length > 0) console.log("Cols:", Object.keys(data[0]));
    else console.log("No template items found, cannot infer cols easily without query or creating one.");

    // Fallback: try to insert dummy with member_id and see error? No that's risky.
    // Better: just add the column if it doesn't exist via SQL migration, it's safer.
}

checkTemplateCols();
