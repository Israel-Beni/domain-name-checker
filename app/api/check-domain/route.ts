import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');
  const tlds = searchParams.get('tlds');

  if (!name || !tlds) {
    return NextResponse.json(
      { error: 'Missing name or tlds parameter' },
      { status: 400 }
    );
  }

  const apiKey = process.env.DOMSCAN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server configuration error: API key missing' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://domscan.net/v1/status?name=${encodeURIComponent(name)}&tlds=${encodeURIComponent(tlds)}`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        // Don't cache this request as domain availability changes
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Failed to fetch from DomScan' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('DomScan Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching domain status' },
      { status: 500 }
    );
  }
}
