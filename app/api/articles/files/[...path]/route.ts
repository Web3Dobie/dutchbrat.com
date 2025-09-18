import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    
    // Proxy to nginx container
    const nginxUrl = `http://nginx-articles:80/articles/${filePath}`
    
    const response = await fetch(nginxUrl)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    const contentType = response.headers.get('content-type') || 'text/plain'
    
    // --- NEW LOGIC ---
    // Check if it's a markdown file.
    if (contentType.includes('markdown') || filePath.endsWith('.md')) {
      // It's a text file, so read it and replace URLs
      const content = await response.text()
      
      const processedContent = content
        .replace(/https:\/\/w3darticles\.blob\.core\.windows\.net\/w3d-articles\//g, '/api/articles/files/images/')
        .replace(/https:\/\/substackhtd\.blob\.core\.windows\.net\/web3dobie-substack\//g, '/api/articles/files/images/')
      
      return new NextResponse(processedContent, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
    
    // --- It's NOT markdown (it's an image or other binary) ---
    // We pass the raw response body (a ReadableStream) directly to the NextResponse.
    // This streams the image without buffering it into a blob.
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
    
  } catch (error) {
    console.error('Error fetching article file:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    )
  }
}