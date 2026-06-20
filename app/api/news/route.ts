import { NextResponse } from 'next/server';

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#\d+;/g, (m) => String.fromCharCode(parseInt(m.slice(2, -1), 10)));
}

function extractText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return '';
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`));
  return match ? match[1] : '';
}

function parseItems(xmlText: string): any[] {
  const items: any[] = [];

  // Try RSS 2.0 (<item>) format first
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const xml = match[1];
    let title = decodeEntities(extractText(xml, 'title'));
    if (!title) continue;
    const link = extractText(xml, 'link');
    let description = decodeEntities(extractText(xml, 'description'));
    const pubDate = extractText(xml, 'pubDate');
    let source = decodeEntities(extractText(xml, 'source'));

    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      source = parts.pop() || source;
      title = parts.join(' - ');
    }
    description = decodeEntities(description).replace(/<[^>]*>/g, '').slice(0, 200);

    items.push({ title, link, pubDate, source: source || 'Google 뉴스', description });
  }

  // Fallback to Atom (<entry>) format
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const xml = match[1];
      const title = decodeEntities(extractText(xml, 'title'));
      if (!title) continue;
      const link = extractAttr(xml, 'link', 'href') || extractText(xml, 'link');
      const pubDate = extractText(xml, 'published') || extractText(xml, 'updated');
      const source = decodeEntities(extractText(xml, 'source'));
      const description = decodeEntities(extractText(xml, 'summary') || '').replace(/<[^>]*>/g, '').slice(0, 200);

      items.push({ title, link, pubDate, source: source || 'Google 뉴스', description });
    }
  }

  return items;
}

export async function GET() {
  try {
    const urls = [
      'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtdHZLQUFQAQ?hl=ko&gl=KR&ceid=KR:ko',
      'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FuSjNjaWdVS0FBUAE?hl=ko&gl=KR&ceid=KR:ko',
      'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko',
    ];

    // Fetch all URLs in parallel
    const results = await Promise.allSettled(
      urls.map((url) =>
        fetch(url, {
          next: { revalidate: 300 },
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VitalsenseBot; +https://vitalsense.com)' },
        }).then((res) => (res.ok ? res.text() : null))
      )
    );

    const seen = new Set<string>();
    const allItems: any[] = [];

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const items = parseItems(result.value);
      for (const item of items) {
        const key = item.title + (item.link || '');
        if (!seen.has(key)) {
          seen.add(key);
          allItems.push(item);
        }
      }
    }

    if (allItems.length === 0) {
      return NextResponse.json({
        items: [
          { title: '건강 뉴스를 불러올 수 없습니다', link: '#', description: 'RSS 피드 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', pubDate: new Date().toISOString(), source: '시스템' },
        ],
      });
    }

    console.log(`[News] Fetched ${allItems.length} unique items from ${urls.length} sources`);
    return NextResponse.json({ items: allItems });
  } catch (error) {
    console.error('[News] Error:', error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
