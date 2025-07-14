import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// --- Interfaces for Type Safety ---
interface TwitterUserResponse {
    data: {
        id: string;
        name: string;
        username: string;
    };
}
interface Tweet {
    id: string;
    text: string;
    created_at: string;
}
interface TweetsResponse {
    data: Tweet[];
}

const BEARER_TOKEN = process.env.X_BEARER_TOKEN!;
const USERNAME = 'Web3_Dobie';

// Helper to get Twitter user ID
async function getUserId(username: string) {
    const resp = await fetch(
        `https://api.twitter.com/2/users/by/username/${username}`,
        { headers: { Authorization: `Bearer ${BEARER_TOKEN}` } }
    );
    const data = await resp.json() as TwitterUserResponse;
    if (!data || !data.data) throw new Error("User not found");
    return data.data.id;
}

router.get('/', async (req, res) => {
    console.log('>>> /api/latest-tweet called');
    try {
        const userId = await getUserId(USERNAME);

        const tweetResp = await fetch(
            `https://api.twitter.com/2/users/${userId}/tweets?max_results=5&tweet.fields=created_at`,
            { headers: { Authorization: `Bearer ${BEARER_TOKEN}` } }
        );
        const tweetData = await tweetResp.json() as TweetsResponse;
        if (!tweetData?.data || !tweetData.data.length)
            return res.status(404).json({ error: "No tweets found" });

        const tweet = tweetData.data[0];
        res.json({
            id: tweet.id,
            text: tweet.text,
            created_at: tweet.created_at,
            url: `https://x.com/${USERNAME}/status/${tweet.id}`,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || "Failed to fetch tweet" });
    }
});

export default router;
