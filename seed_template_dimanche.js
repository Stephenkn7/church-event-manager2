
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seedTemplate() {
    console.log("Creating Template: Culte Du Dimanche...");

    // 1. Create Template
    const { data: template, error: err1 } = await supabase
        .from('templates')
        .insert([{
            name: 'Culte Du Dimanche',
            description: 'Format standard hétérogène (08h15 - 11h10)'
        }])
        .select()
        .single();

    if (err1) {
        console.error("Error creating template:", err1);
        return;
    }

    const tid = template.id;
    console.log("Template Created ID:", tid);

    // 2. Prepare Items
    // 08H15-08H25 : ENTREE DE L'AUDITOIRE (10m)
    // 08H25-08H35 : MODERATEUR (10m)
    // 08H35-09H20 : LOUANGE (45m)
    // 09H20-09H30 : SAINTE CENE (10m)
    // 09H30-09H40 : DIMES (10m)
    // 09H40-09H50 : ANNONCE (10m)
    // 09H50-10H00 : TRIBUS (10m)
    // 10H00-11H00 : MESSAGE (60m)
    // 11H00-11H05 : DERNIERE ANNONCE (5m)
    // 11H05-11H10 : PRIERE FIN (5m)

    // Total Duration: 175 minutes (2h 55m)

    const items = [
        { template_id: tid, order_index: 0, title: "ENTREE DE L'AUDITOIRE", duration: 600, type: 'GENERIC' },
        { template_id: tid, order_index: 1, title: "MODERATEUR CULTE (PRIERE D'OUVERTURE)", duration: 600, type: 'SPEECH' },
        { template_id: tid, order_index: 2, title: "LOUANGE ET ADORATION", duration: 2700, type: 'SONG' },
        { template_id: tid, order_index: 3, title: "SAINTE CENE (Pst BLANDINE)", duration: 600, type: 'GENERIC' },
        { template_id: tid, order_index: 4, title: "DIMES ET OFFRANDES (Past Blandine)", duration: 600, type: 'GENERIC' },
        { template_id: tid, order_index: 5, title: "ANNONCE (SYNTICHE YANGRA)", duration: 600, type: 'SPEECH' },
        { template_id: tid, order_index: 6, title: "INSTANT DE TRIBUS ET FDV (TRIBU EPHRAÏM)", duration: 600, type: 'GENERIC' },
        { template_id: tid, order_index: 7, title: "MESSAGE ET MINISTERE", duration: 3600, type: 'SPEECH' },
        { template_id: tid, order_index: 8, title: "DERNIERE ANNONCE ET PRESENTATION (SYNTICHE YANGRA)", duration: 300, type: 'SPEECH' },
        { template_id: tid, order_index: 9, title: "PRIERE DE FIN ET RENVOIE", duration: 300, type: 'GENERIC' }
    ];

    const { error: err2 } = await supabase.from('template_items').insert(items);

    if (err2) {
        console.error("Error inserting items:", err2);
    } else {
        console.log("Success! Added", items.length, "items.");
    }
}

seedTemplate();
