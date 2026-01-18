// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

Deno.serve(async (req) => {
    const { name } = await req.json()
    const data = {
        message: `Hello ${name || "world"}!`,
    }

    // TODO: Add Twilio / WhatsApp Business API logic here
    // 1. Get secrets from Deno.env.get('TWILIO_ACCOUNT_SID') etc.
    // 2. Fetch list of leaders (Intervenants) from Supabase
    // 3. Send message to each number

    return new Response(
        JSON.stringify(data),
        { headers: { "Content-Type": "application/json" } },
    )
})
