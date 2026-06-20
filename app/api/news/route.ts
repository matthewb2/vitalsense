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

function extractImageFromXML(xml: string): string | null {
  const mediaMatch = xml.match(/<media:content[^>]*url="([^"]+)"/i);
  if (mediaMatch) return mediaMatch[1];
  const enclosureMatch = xml.match(/<enclosure[^>]*url="([^"]+)"/i);
  if (enclosureMatch) return enclosureMatch[1];
  const desc = extractText(xml, 'description');
  const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

function parseItems(xmlText: string, feedSource: string): any[] {
  const items: any[] = [];

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
    const ogImage = extractImageFromXML(xml);

    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      source = parts.pop() || source;
      title = parts.join(' - ');
    }
    description = decodeEntities(description).replace(/<[^>]*>/g, '').slice(0, 200);

    items.push({ title, link, pubDate, source: source || feedSource, description, ogImage });
  }

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
      const ogImage = extractImageFromXML(xml);

      items.push({ title, link, pubDate, source: source || feedSource, description, ogImage });
    }
  }

  return items;
}

async function scrapeOGImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const rssUrls = [
      { url: 'https://www.yna.co.kr/rss/health.xml', source: '연합뉴스' },
      { url: 'https://rss.donga.com/health.xml', source: '동아일보' },
      { url: 'https://api.newswire.co.kr/rss/industry/1000', source: '뉴스와이어' },
      { url: 'https://health.chosun.com/site/data/rss/rss.xml', source: '헬스조선' },
      { url: 'https://www.khan.co.kr/rss/rssdata/life_news.xml', source: '경향신문' },
      { url: 'https://www.newsis.com/RSS/health.xml', source: '뉴시스' },
    ];

    const results = await Promise.allSettled(
      rssUrls.map(({ url }) =>
        fetch(url, {
          next: { revalidate: 300 },
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        }).then(async (res) => {
          const text = res.ok ? await res.text() : null;
          console.log(`[News] ${url}: status=${res.status} length=${text?.length || 0}`);
          return text;
        })
      )
    );

    const seen = new Set<string>();
    const allItems: any[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { url, source: feedSource } = rssUrls[i];
      if (result.status !== 'fulfilled') {
        console.log(`[News] ${url} rejected:`, result.reason);
        continue;
      }
      if (!result.value) {
        console.log(`[News] ${url} returned empty`);
        continue;
      }
      const items = parseItems(result.value, feedSource);
      console.log(`[News] ${url}: parsed ${items.length} items`);
      const prevCount = allItems.length;
      for (const item of items) {
        const key = item.title + (item.link || '');
        if (!seen.has(key)) {
          seen.add(key);
          allItems.push(item);
        }
      }
      console.log(`[News] ${url}: ${allItems.length - prevCount} new unique items`);
    }

    if (allItems.length === 0) {
      return NextResponse.json({
        items: [
          { title: '건강 뉴스를 불러올 수 없습니다', link: '#', description: 'RSS 피드 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', pubDate: new Date().toISOString(), source: '시스템' },
        ],
      });
    }

    console.log(`[News] Fetched ${allItems.length} unique items from ${rssUrls.length} sources`);

    // Sort by pubDate descending (newest first)
    allItems.sort((a, b) => {
      const da = new Date(a.pubDate).getTime();
      const db = new Date(b.pubDate).getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });

    // Scrape OG images only for items that don't have one from RSS
    const itemsNeedingOG = allItems
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !item.ogImage && item.link && item.link !== '#');

    if (itemsNeedingOG.length > 0) {
      const ogResults = await Promise.allSettled(
        itemsNeedingOG.map(({ item }) =>
          scrapeOGImage(item.link)
        )
      );
      ogResults.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) {
          allItems[itemsNeedingOG[idx].i].ogImage = r.value;
        }
      });
    }
    console.log(`[News] OG images found: ${allItems.filter(i => i.ogImage).length} / ${allItems.length}`);

    return NextResponse.json({ items: allItems });
  } catch (error) {
    console.error('[News] Error:', error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
