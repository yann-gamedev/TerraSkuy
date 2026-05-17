import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unknown error';
};

const BACKEND_TIMEOUT_MS = 30000;

type BackendFile = {
  filename?: string;
  server_filename?: string;
  size?: string | number;
  size_bytes?: number;
  direct_link?: string | null;
  download_link?: string | null;
  link?: string | null;
  dlink?: string | null;
  thumbnail?: string | null;
  thumbnails?: {
    original?: string | null;
    [key: string]: string | null | undefined;
  } | null;
};

type BackendResponse = {
  status?: string;
  message?: string;
  error?: string;
  files?: BackendFile[];
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
      'terabox.app',
      'teraboxshare.com',
      'teraboxlink.com',
      'terasharefile.com',
      'terafileshare.com',
      'terasharelink.com'
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

const fetchBackendJson = async (apiUrl: string, url: string): Promise<BackendResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}/api2?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
      cache: 'no-store',
    });

    const responseText = await response.text();
    let result: BackendResponse = {};

    if (responseText) {
      try {
        result = JSON.parse(responseText) as BackendResponse;
      } catch {
        throw new Error(`Backend mengembalikan response non-JSON (HTTP ${response.status}): ${responseText.slice(0, 200)}`);
      }
    }

    if (!response.ok) {
      throw new Error(result.message || result.error || `Gagal mengakses Python backend (HTTP ${response.status})`);
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Python backend timeout. Pastikan terabox-gateway berjalan di port 5000.');
    }

    if (error instanceof TypeError) {
      throw new Error(`Python backend tidak bisa dihubungi di ${apiUrl}. Jalankan terabox-gateway terlebih dahulu.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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

    const apiUrl = process.env.TERABOX_API_URL || 'http://localhost:5000';
    const result = await fetchBackendJson(apiUrl, url);
    console.log('Python /api2 response summary:', {
      status: result.status,
      fileCount: result.files?.length ?? 0,
      firstFileKeys: result.files?.[0] ? Object.keys(result.files[0]) : [],
    });

    if (result.status === 'error') {
      const errorMessage = result.message || result.error || 'Terjadi kesalahan pada backend.';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    if (!result.files || result.files.length === 0) {
      return NextResponse.json({ error: 'File tidak ditemukan atau link tidak valid.' }, { status: 404 });
    }

    const fileInfo = result.files[0];
    const filename = fileInfo.filename || fileInfo.server_filename || 'Unknown File';
    const dlink = fileInfo.direct_link || fileInfo.download_link || fileInfo.link || fileInfo.dlink || '';
    const thumbnail = fileInfo.thumbnails?.original || fileInfo.thumbnail || null;
    
    const responseData = {
      filename: filename,
      size: fileInfo.size || 'Unknown Size',
      dlink: dlink,
      thumbnail,
      fileType: getFileType(filename),
      directDownload: !!dlink,
      originalUrl: url,
      error: null
    };

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: getErrorMessage(error),
        details: 'Next.js hanya meneruskan request. Periksa apakah Python terabox-gateway berjalan dan COOKIE_JSON terbaca.',
      },
      { status: 502 }
    );
  }
}
