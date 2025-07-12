// routes/articles.ts
import { Router, Request, Response } from 'express';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

router.get('/', async (req: Request, res: Response) => {
    try {
        const response = await notion.databases.query({ database_id: databaseId });

        const articles = response.results.map((page: any) => ({
            id: page.id,
            date: page.properties?.Date?.date?.start || null,
            headline: page.properties?.Headline?.title?.[0]?.plain_text || 'Untitled',
            summary: page.properties?.Summary?.rich_text?.[0]?.text?.content || '',
            tags: page.properties?.Tags?.multi_select?.map((t: any) => t.name) || [],
            category: page.properties?.Category?.select?.name || null,
            link: page.properties?.Tweet?.url || null,
            status: page.properties?.Status?.status?.name || 'Unknown',
            file: page.properties?.File?.url || null,
        }));

        res.json(articles);
    } catch (err: any) {
        console.error('❌ Error fetching articles:', err.message || err);
        res.status(500).json({ error: 'Failed to load articles.' });
    }
});

export default router;
