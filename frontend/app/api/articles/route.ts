export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

// Helper function to extract plain text from Notion rich text
function getPlainText(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(item => item.plain_text || '').join('');
}

// Helper function to extract title from Notion title property
function getTitle(titleProperty: any): string {
  if (!titleProperty || !titleProperty.title) return '';
  return getPlainText(titleProperty.title);
}

// Helper function to extract select property value
function getSelectValue(selectProperty: any): string {
  if (!selectProperty || !selectProperty.select) return '';
  return selectProperty.select.name || '';
}

// Helper function to extract URL property value
function getUrlValue(urlProperty: any): string {
  if (!urlProperty || !urlProperty.url) return '';
  return urlProperty.url;
}

// Helper function to extract date property value
function getDateValue(dateProperty: any): string {
  if (!dateProperty || !dateProperty.date) return '';
  return dateProperty.date.start || '';
}

// Helper function to extract multi-select values
function getMultiSelectValues(multiSelectProperty: any): string[] {
  if (!multiSelectProperty || !multiSelectProperty.multi_select) return [];
  return multiSelectProperty.multi_select.map((item: any) => item.name || '');
}

export async function GET(req: NextRequest) {
  try {
    const databaseId = process.env.NOTION_DB_ID!
    const response = await notion.databases.query({
      database_id: databaseId,
    })

    // Transform Notion pages to Article objects
    const articles = response.results.map((page: any) => {
      const properties = page.properties;
      
      return {
        id: page.id,
        headline: getTitle(properties.Headline),
        summary: getPlainText(properties.Summary?.rich_text),
        file: getUrlValue(properties.File),
        date: getDateValue(properties.Date),
        link: getUrlValue(properties.Tweet), // Using Tweet URL as link
        tags: getMultiSelectValues(properties.Tags),
        status: getSelectValue(properties.Status),
        category: getSelectValue(properties.Category)
      };
    });

    // Filter for published articles only
    const publishedArticles = articles.filter(article => 
      article.status.toLowerCase() === 'published'
    );

    // Sort by date (newest first)
    publishedArticles.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    console.log(`Returning ${publishedArticles.length} published articles`);
    
    return NextResponse.json(publishedArticles)
  } catch (err: any) {
    console.error('Error fetching articles:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}