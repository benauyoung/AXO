export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Simple bearer auth — set ADMIN_SECRET in Vercel env vars
    const auth = req.headers['authorization'];
    const secret = process.env.ADMIN_SECRET;
    if (!secret || auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        });

        const emails = await redis.smembers('subscribers');
        const subscribers = [];

        for (const email of emails) {
            const meta = await redis.hgetall(`subscriber:${email}`);
            subscribers.push(meta || { email });
        }

        // Sort newest first
        subscribers.sort((a, b) =>
            (b.subscribedAt || '').localeCompare(a.subscribedAt || '')
        );

        return res.status(200).json({ total: subscribers.length, subscribers });
    } catch (err) {
        console.error('Subscribers fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch subscribers.' });
    }
}
