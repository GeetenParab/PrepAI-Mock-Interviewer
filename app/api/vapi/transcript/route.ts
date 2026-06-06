// Task 3: Vapi Transcript Fallback
// Fetches the official transcript for a completed call from the Vapi REST API.
// Called when the client-side WebSocket transcript is too short (e.g., user disconnected abruptly).

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
        return Response.json({ success: false, error: 'callId is required' }, { status: 400 });
    }

    const vapiKey = process.env.VAPI_API_KEY;
    if (!vapiKey) {
        return Response.json({ success: false, error: 'VAPI_API_KEY not configured' }, { status: 500 });
    }

    try {
        const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
            headers: {
                Authorization: `Bearer ${vapiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            console.error('Vapi API error:', res.status, await res.text());
            return Response.json({ success: false, error: 'Failed to fetch call from Vapi' }, { status: 502 });
        }

        const callData = await res.json();

        // Vapi returns transcript as an array of { role, message } objects
        // or as a string — we handle both
        let transcript: { role: string; content: string }[] = [];

        if (Array.isArray(callData.transcript)) {
            // Array format: [{role: 'user'|'assistant', message: '...'}]
            transcript = callData.transcript
                .filter((t: any) => t.role && (t.message || t.text))
                .map((t: any) => ({
                    role: t.role === 'assistant' ? 'assistant' : 'user',
                    content: t.message || t.text || '',
                }));
        } else if (typeof callData.transcript === 'string' && callData.transcript.length > 0) {
            // String format — parse "Role: message" lines
            const lines = callData.transcript.split('\n').filter(Boolean);
            transcript = lines.map((line: string) => {
                const colonIdx = line.indexOf(':');
                if (colonIdx === -1) return { role: 'user', content: line.trim() };
                const role = line.slice(0, colonIdx).toLowerCase().trim();
                const content = line.slice(colonIdx + 1).trim();
                return {
                    role: role.includes('assistant') || role.includes('ai') ? 'assistant' : 'user',
                    content,
                };
            }).filter((t: any) => t.content);
        }

        return Response.json({ success: true, transcript }, { status: 200 });

    } catch (error: any) {
        console.error('Error fetching Vapi transcript:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
