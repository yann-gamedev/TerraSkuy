import { NextResponse } from 'next/server';

// Optional: Force Edge Runtime for better stream handling performance and compatibility as requested
export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const filename = searchParams.get('filename') || 'downloaded_file';

    if (!url) {
      return NextResponse.json({ error: 'Parameter url (direct link) diperlukan' }, { status: 400 });
    }

    const decodedUrl = decodeURIComponent(url);

    // Timeout control: 30 detik
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(decodedUrl, {
        headers: {
          'Referer': 'https://www.terabox.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({ error: `Gagal fetch dari upstream (Status: ${response.status})` }, { status: response.status });
      }

      const headers = new Headers();
      // Ensure safe filename format
      const safeFilename = filename.replace(/["\\]/g, '');
      headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
      
      const contentType = response.headers.get('content-type');
      if (contentType) {
        headers.set('Content-Type', contentType);
      } else {
        headers.set('Content-Type', 'application/octet-stream');
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        headers.set('Content-Length', contentLength);
      }

      // Return the response body stream directly
      return new NextResponse(response.body, {
        status: 200,
        headers,
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ error: 'Request timeout setelah 30 detik' }, { status: 504 });
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error('Download Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
