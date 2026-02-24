// Upstash Redis REST API — no SDK, no module issues
async function redis(command, ...args) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    const res = await fetch(`${url}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([command, ...args]),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.result;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required.' });
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        return res.status(400).json({ error: 'Invalid email address.' });
    }

    try {
        // Check duplicate
        const exists = await redis('SISMEMBER', 'subscribers', trimmed);
        if (exists) {
            return res.status(409).json({ error: 'This email is already on the waitlist.' });
        }

        // Add to set
        await redis('SADD', 'subscribers', trimmed);

        // Store metadata as a hash
        const now = new Date().toISOString();
        await redis('HSET', `subscriber:${trimmed}`,
            'email', trimmed,
            'subscribedAt', now,
            'source', req.headers['referer'] || 'direct'
        );

        const total = await redis('SCARD', 'subscribers');

        return res.status(201).json({
            message: "You're on the list! We'll be in touch within 48 hours.",
            total,
        });
    } catch (err) {
        console.error('Subscribe error:', err);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
