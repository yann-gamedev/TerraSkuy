import { NextResponse } from 'next/server';

export const runtime = 'edge';

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
  "Referer": "https://www.terabox.com/"
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const filename = searchParams.get('filename') || 'preview_file';

    if (!url) {
      return NextResponse.json({ error: 'Parameter url (direct link) diperlukan' }, { status: 400 });
    }

    const decodedUrl = decodeURIComponent(url);

    // Timeout control: 45 detik
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      let currentUrl = decodedUrl;
      let response: Response | null = null;
      let redirectCount = 0;
      const MAX_REDIRECTS = 5;

      while (redirectCount < MAX_REDIRECTS) {
        response = await fetch(currentUrl, {
          headers: HEADERS,
          signal: controller.signal,
          redirect: 'manual', // Manual follow redirect
        });

        // Cek apakah response berupa redirect
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          if (!location) {
            break; // Tidak ada location, kita stop
          }
          // Handle path relative
          currentUrl = new URL(location, currentUrl).toString();
          redirectCount++;
        } else {
          break; // Bukan redirect, stop loop
        }
      }

      clearTimeout(timeoutId);

      if (!response || !response.ok) {
        return NextResponse.json(
          { error: `Gagal fetch dari upstream (Status: ${response ? response.status : 'Unknown'})` }, 
          { status: response ? response.status : 500 }
        );
      }

      const headers = new Headers();
      // Ensure safe filename format
      const safeFilename = filename.replace(/["\\]/g, '');
      
      // PERBEDAAN UNTUK PREVIEW: Inline dan Accept-Ranges
      headers.set('Content-Disposition', `inline; filename="${safeFilename}"`);
      headers.set('Accept-Ranges', 'bytes');
      
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
        return NextResponse.json({ error: 'Request timeout setelah 45 detik' }, { status: 504 });
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error('Preview Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
