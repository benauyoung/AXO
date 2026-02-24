const { Redis } = require('@upstash/redis');

module.exports = async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body || {};

    // Validate
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required.' });
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        return res.status(400).json({ error: 'Invalid email address.' });
    }

    try {
        const redis = new Redis({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        });

        // Check for duplicate
        const exists = await redis.sismember('subscribers', trimmed);
        if (exists) {
            return res.status(409).json({ error: 'This email is already on the waitlist.' });
        }

        // Add to subscribers set + store metadata
        await redis.sadd('subscribers', trimmed);
        await redis.hset(`subscriber:${trimmed}`, {
            email: trimmed,
            subscribedAt: new Date().toISOString(),
            source: req.headers['referer'] || 'direct',
        });

        const total = await redis.scard('subscribers');

        return res.status(201).json({
            message: "You're on the list! We'll be in touch within 48 hours.",
            total,
        });
    } catch (err) {
        console.error('Subscribe error:', err);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
