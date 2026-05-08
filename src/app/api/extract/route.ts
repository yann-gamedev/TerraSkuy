import { NextResponse } from 'next/server';

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1"
};

const isValidTeraboxUrl = (urlString: string) => {
  try {
    let urlToParse = urlString;
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlToParse = 'https://' + urlString;
    }
    const parsed = new URL(urlToParse);
    const validDomains = [
      'terabox.com', 
      '1024terabox.com', 
      'teraboxapp.com', 
      '1024tera.com',
      '4funbox.com',
      'mirrobox.com',
      'nephobox.com',
      'freeterabox.com',
      'terabox.app'
    ];
    return validDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

const getFileType = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (['mp4', 'mkv', 'mov', 'avi', 'm4v'].includes(ext)) return 'video';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['pdf', 'docx', 'xlsx'].includes(ext)) return 'document';
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
  return 'other';
};

const parseTeraboxUrl = (urlStr: string) => {
  try {
    const parsed = new URL(urlStr);
    
    // Format 2: ?surl=XXXXXX
    if (parsed.searchParams.has('surl')) {
      return {
        shortId: parsed.searchParams.get('surl'),
        type: 'surl'
      };
    }
    
    // Format 1 & 3: /s/XXXXXX
    const match = parsed.pathname.match(/\/s\/([^/]+)/);
    if (match && match[1]) {
      return {
        shortId: match[1],
        type: 'short'
      };
    }
  } catch (e) {
    return { shortId: null, type: null };
  }
  return { shortId: null, type: null };
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isValidTeraboxUrl(url)) {
      return NextResponse.json({ error: 'Format URL tidak valid. Pastikan link dari Terabox.' }, { status: 422 });
    }

    let resultData = null;
    let fallbackNeeded = false;

    // TAHAP 1: Coba External Resolver (hnn.workers.dev)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for resolver

    try {
      const response = await fetch('https://terabox.hnn.workers.dev/api/get-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': HEADERS['User-Agent']
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upstream Error: ${response.status}`);
      }

      const result = await response.json();

      let fileInfo = result;
      if (Array.isArray(result) && result.length > 0) fileInfo = result[0];
      else if (result.list && result.list.length > 0) fileInfo = result.list[0];
      else if (result.data) {
        if (Array.isArray(result.data) && result.data.length > 0) fileInfo = result.data[0];
        else fileInfo = result.data;
      }

      const filename = fileInfo.filename || fileInfo.name || fileInfo.file_name || 'Unknown File';
      const sizeRaw = fileInfo.size || fileInfo.filesize || fileInfo.sizebytes || 'Unknown Size';
      const dlink = fileInfo.dlink || fileInfo.downloadLink || fileInfo.link;
      const thumbnail = fileInfo.thumb || fileInfo.thumbnail || fileInfo.image || fileInfo.cover || null;

      if (dlink) {
        let sizeStr = typeof sizeRaw === 'number' ? (sizeRaw / (1024 * 1024)).toFixed(2) + ' MB' : sizeRaw;
        resultData = {
          filename,
          size: sizeStr,
          dlink,
          thumbnail,
          fileType: getFileType(filename),
          error: null
        };
      } else {
        fallbackNeeded = true;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('External resolver failed, triggering fallback...', err);
      fallbackNeeded = true;
    }

    // TAHAP 2: Jika Eksternal Gagal, gunakan Fallback Internal (2-stage Fetch)
    if (fallbackNeeded || !resultData) {
      console.log('Using Internal Extraction Logic...');
      const response = await fetch(url, { headers: HEADERS });

      if (response.status === 404) return NextResponse.json({ error: 'File tidak ditemukan (Status 404)' }, { status: 404 });
      if (response.status === 429) return NextResponse.json({ error: 'Terlalu banyak request (Rate limit). Coba lagi nanti.' }, { status: 429 });
      if (!response.ok) return NextResponse.json({ error: `Gagal mengakses URL Terabox (Status HTTP: ${response.status})` }, { status: response.status });

      const html = await response.text();
      const pageText = html.toLowerCase();
      if (pageText.includes('file not found') || pageText.includes('link expired') || pageText.includes('the share has been cancelled')) {
        return NextResponse.json({ error: 'Link expired atau file sudah dihapus' }, { status: 410 });
      }

      let jsToken = '';
      const tokenMatch1 = html.match(/"jsToken"\s*:\s*"([^"]+)"/);
      const tokenMatch2 = html.match(/%22jsToken%22%3A%22(.*?)(?=%22)/);
      const tokenMatch3 = html.match(/window\.jsToken\s*=\s*['"]([^'"]+)['"]/);

      if (tokenMatch1) jsToken = tokenMatch1[1];
      else if (tokenMatch2) jsToken = decodeURIComponent(tokenMatch2[1]);
      else if (tokenMatch3) jsToken = tokenMatch3[1];

      if (!jsToken) {
         const fallbackMatch = html.match(/jsToken=([^&"']+)/);
         if (fallbackMatch) jsToken = fallbackMatch[1];
      }

      const { shortId, type } = parseTeraboxUrl(url);
      let shortUrl = shortId;
      if (!shortUrl) {
        const shortUrlMatch = html.match(/"shorturl"\s*:\s*"([^"]+)"/);
        if (shortUrlMatch) shortUrl = shortUrlMatch[1];
      }

      if (!shortUrl || !jsToken) {
        return NextResponse.json({ 
          error: 'Gagal mendapatkan parameter jsToken atau shorturl dari halaman. Mungkin Terabox meminta captcha atau halaman dilindungi.',
          needsCaptcha: true
        }, { status: 422 });
      }

      let apiShortUrl = shortUrl;
      if (type === 'surl' && !apiShortUrl.startsWith('1')) {
        apiShortUrl = '1' + shortUrl;
      }

      const apiUrl = `https://www.terabox.com/share/list?app_id=250528&shorturl=${apiShortUrl}&root=1&jsToken=${jsToken}`;
      const apiHeaders = { ...HEADERS, "Referer": url };

      const apiResponse = await fetch(apiUrl, { headers: apiHeaders });
      if (!apiResponse.ok) {
        return NextResponse.json({ error: `Gagal mengakses API internal Terabox (Status HTTP: ${apiResponse.status})` }, { status: apiResponse.status });
      }

      const apiResult = await apiResponse.json();
      if (apiResult.errno !== 0 || !apiResult.list || apiResult.list.length === 0) {
        return NextResponse.json({ error: `Gagal mengekstrak list file. (Errno: ${apiResult.errno})` }, { status: 422 });
      }

      const fileInfo = apiResult.list[0];
      const filename = fileInfo.server_filename || fileInfo.filename || 'Unknown File';
      const filesize = fileInfo.size ? (Number(fileInfo.size) / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown Size';
      const dlink = fileInfo.dlink || fileInfo.downloadLink || '';

      if (!dlink) {
        return NextResponse.json({ error: 'Direct link tidak ditemukan pada JSON response Terabox.' }, { status: 422 });
      }

      resultData = {
        filename,
        size: filesize,
        dlink,
        thumbnail: fileInfo.thumbs ? fileInfo.thumbs.url3 || null : null,
        fileType: getFileType(filename),
        error: null
      };
    }

    return NextResponse.json(resultData);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
