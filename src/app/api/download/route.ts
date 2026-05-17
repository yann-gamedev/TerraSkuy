import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const filename = searchParams.get('filename') || 'downloaded_file';

    if (!url) {
      return NextResponse.json({ error: 'Parameter url (direct link) diperlukan' }, { status: 400 });
    }

    const apiUrl = process.env.TERABOX_API_URL || 'http://localhost:5000';
    const backendUrl = new URL('/download', apiUrl);
    backendUrl.searchParams.set('url', url);
    backendUrl.searchParams.set('filename', filename);

    return NextResponse.redirect(backendUrl);
  } catch (error: unknown) {
    console.error('Download Proxy Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
