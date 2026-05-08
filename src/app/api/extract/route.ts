import { NextResponse } from 'next/server';

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

    // Gunakan AbortController untuk timeout 15 detik
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      // Forward ke external resolver
      const response = await fetch('https://terabox.hnn.workers.dev/api/get-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upstream Error: ${response.status}`);
      }

      const result = await response.json();

      // Parser data dari response (menyesuaikan berbagai format JSON dari API pihak ketiga)
      let fileInfo = result;
      if (Array.isArray(result) && result.length > 0) {
        fileInfo = result[0];
      } else if (result.list && result.list.length > 0) {
        fileInfo = result.list[0];
      } else if (result.data) {
        // jika API mengembalikan { data: { ... } } atau { data: [ ... ] }
        if (Array.isArray(result.data) && result.data.length > 0) {
          fileInfo = result.data[0];
        } else {
          fileInfo = result.data;
        }
      }

      const filename = fileInfo.filename || fileInfo.name || fileInfo.file_name || 'Unknown File';
      const size = fileInfo.size || fileInfo.filesize || fileInfo.sizebytes || 'Unknown Size';
      const dlink = fileInfo.dlink || fileInfo.downloadLink || fileInfo.link;
      const thumbnail = fileInfo.thumb || fileInfo.thumbnail || fileInfo.image || fileInfo.cover || null;

      if (!dlink) {
        return NextResponse.json({ error: 'Gagal mendapatkan direct link. Layanan API tidak mendeteksi file pada URL tersebut.' }, { status: 422 });
      }

      const fileType = getFileType(filename);
      let sizeStr = typeof size === 'number' ? (size / (1024 * 1024)).toFixed(2) + ' MB' : size;

      return NextResponse.json({
        filename,
        size: sizeStr,
        dlink,
        thumbnail,
        fileType,
        error: null
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('Resolver fetch error:', fetchError);
      return NextResponse.json({ error: 'Layanan sedang tidak tersedia, coba beberapa saat lagi' }, { status: 503 });
    }

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
