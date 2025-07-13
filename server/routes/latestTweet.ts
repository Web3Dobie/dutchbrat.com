console.log(">>> latestTweet router loaded");

import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
    console.log('>>> /api/latest-tweet called');
    res.json({ msg: 'pong' });
});

export default router;


