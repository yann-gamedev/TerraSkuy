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

    const apiUrl = process.env.TERABOX_API_URL || 'http://localhost:5000';
    
    const response = await fetch(`${apiUrl}/api2?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      let errorMessage = `Gagal mengakses API Backend (Status HTTP: ${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Fallback
      }
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const result = await response.json();

    if (result.status === 'error') {
      const errorMessage = result.message || result.error || 'Terjadi kesalahan pada backend.';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    if (!result.files || result.files.length === 0) {
      return NextResponse.json({ error: 'File tidak ditemukan atau link tidak valid.' }, { status: 404 });
    }

    const fileInfo = result.files[0];
    const filename = fileInfo.filename || 'Unknown File';
    const dlink = fileInfo.direct_link || fileInfo.download_link || '';
    
    const responseData = {
      filename: filename,
      size: fileInfo.size || 'Unknown Size',
      dlink: dlink,
      thumbnail: fileInfo.thumbnails?.original || null,
      fileType: getFileType(filename),
      directDownload: !!dlink,
      originalUrl: url,
      error: null
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
