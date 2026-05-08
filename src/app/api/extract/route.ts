import { NextResponse } from 'next/server';

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1"
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

    // TAHAP 1: Fetch halaman awal
    const response = await fetch(url, {
      headers: HEADERS,
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

    const pageText = html.toLowerCase();
    if (
      pageText.includes('file not found') || 
      pageText.includes('link expired') || 
      pageText.includes('the share has been cancelled')
    ) {
      return NextResponse.json({ error: 'Link expired atau file sudah dihapus' }, { status: 410 });
    }

    // Ekstrak jsToken
    let jsToken = '';
    const tokenMatch1 = html.match(/"jsToken"\s*:\s*"([^"]+)"/);
    const tokenMatch2 = html.match(/%22jsToken%22%3A%22([^%"]+)%22/);
    const tokenMatch3 = html.match(/window\.jsToken\s*=\s*['"]([^'"]+)['"]/);

    if (tokenMatch1) jsToken = tokenMatch1[1];
    else if (tokenMatch2) jsToken = decodeURIComponent(tokenMatch2[1]);
    else if (tokenMatch3) jsToken = tokenMatch3[1];

    if (!jsToken) {
       // Fallback mencoba cari jsToken di inline script dengan eval-like regex atau pola lain
       const fallbackMatch = html.match(/jsToken=([^&"']+)/);
       if (fallbackMatch) jsToken = fallbackMatch[1];
    }

    // Ekstrak shorturl menggunakan parseTeraboxUrl
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

    // Pastikan shorturl valid, beberapa case terabox surl memerlukan awalan '1' pada API internalnya
    // Tergantung pattern, kita gunakan apa adanya dulu
    let apiShortUrl = shortUrl;
    if (type === 'surl' && !apiShortUrl.startsWith('1')) {
      // Pada endpoint share/list, surl biasanya diparsing jadi 1 + surl
      apiShortUrl = '1' + shortUrl;
    }

    // TAHAP 2: Fetch endpoint API internal Terabox
    const apiUrl = `https://www.terabox.com/share/list?app_id=250528&shorturl=${apiShortUrl}&root=1&jsToken=${jsToken}`;
    
    const apiHeaders = {
      ...HEADERS,
      "Referer": url,
    };

    const apiResponse = await fetch(apiUrl, {
      headers: apiHeaders
    });

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
    const directUrl = fileInfo.dlink || fileInfo.downloadLink || '';

    if (!directUrl) {
      return NextResponse.json({ error: 'Direct link tidak ditemukan pada JSON response Terabox.' }, { status: 422 });
    }

    return NextResponse.json({
      filename,
      filesize,
      directUrl,
      error: null
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
