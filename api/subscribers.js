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
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const auth = req.headers['authorization'];
    const secret = process.env.ADMIN_SECRET;
    if (!secret || auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const emails = await redis('SMEMBERS', 'subscribers');
        const subscribers = [];

        for (const email of emails) {
            const meta = await redis('HGETALL', `subscriber:${email}`);
            // HGETALL returns flat array: [key, val, key, val, ...]
            const obj = {};
            if (Array.isArray(meta)) {
                for (let i = 0; i < meta.length; i += 2) {
                    obj[meta[i]] = meta[i + 1];
                }
            }
            subscribers.push(obj.email ? obj : { email });
        }

        subscribers.sort((a, b) =>
            (b.subscribedAt || '').localeCompare(a.subscribedAt || '')
        );

        return res.status(200).json({ total: subscribers.length, subscribers });
    } catch (err) {
        console.error('Subscribers fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch subscribers.' });
    }
};
