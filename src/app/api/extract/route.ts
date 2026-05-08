import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.status === 404) {
      return NextResponse.json({ error: 'File tidak ditemukan (Status 404)' }, { status: 404 });
    }

    if (response.status === 429) {
      return NextResponse.json({ error: 'Terlalu banyak request (Rate limit). Coba lagi nanti.' }, { status: 429 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: `Gagal mengakses URL Terabox (Status HTTP: ${response.status})` }, { status: response.status });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const pageText = $('body').text().toLowerCase();
    if (
      pageText.includes('file not found') || 
      pageText.includes('link expired') || 
      pageText.includes('has been cancelled') || 
      pageText.includes('the share has been cancelled')
    ) {
      return NextResponse.json({ error: 'Link expired atau file sudah dihapus' }, { status: 410 });
    }

    let filename = '';
    let filesize = '';
    let directUrl = '';

    const scripts = $('script').toArray();
    for (const script of scripts) {
      const scriptContent = $(script).html() || '';

      if (scriptContent.includes('window.__INITIAL_STATE__')) {
        const match = scriptContent.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});\s*(?:window|console|$)/s);
        const fallbackMatch = scriptContent.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*\});/);
        
        const stateStr = (match && match[1]) || (fallbackMatch && fallbackMatch[1]);
        
        if (stateStr) {
          try {
            const state = JSON.parse(stateStr);
            const list = state?.share?.list || state?.shareInfo?.fileList || [];
            if (list.length > 0) {
              filename = list[0].server_filename || list[0].filename || filename;
              filesize = list[0].size || filesize;
              directUrl = list[0].dlink || list[0].downloadLink || directUrl;
            }
          } catch (e) {
            console.error('Gagal parse window.__INITIAL_STATE__', e);
          }
        }
      }

      if (scriptContent.includes('window.FileInfoPage')) {
        const match = scriptContent.match(/window\.FileInfoPage\s*=\s*(\{.*?\});\s*(?:window|console|$)/s);
        const fallbackMatch = scriptContent.match(/window\.FileInfoPage\s*=\s*(\{.*\});/);
        
        const stateStr = (match && match[1]) || (fallbackMatch && fallbackMatch[1]);

        if (stateStr) {
          try {
            const state = JSON.parse(stateStr);
            filename = state.filename || state.server_filename || filename;
            filesize = state.size || filesize;
            directUrl = state.dlink || state.downloadLink || directUrl;
          } catch (e) {
            console.error('Gagal parse window.FileInfoPage', e);
          }
        }
      }
    }

    if (!filename) {
      filename = $('meta[property="og:title"]').attr('content') || $('title').text().replace(' - TeraBox', '').trim();
    }

    if (!directUrl) {
      directUrl = $('meta[name="dlink"]').attr('content') || '';
    }

    return NextResponse.json({
      filename: filename || 'Unknown File',
      filesize: filesize || 'Unknown Size',
      directUrl: directUrl || null,
      error: !directUrl && !filename ? 'Data file atau direct link tidak ditemukan' : null
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
