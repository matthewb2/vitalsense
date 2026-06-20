function decodeEntities(text) {
  return text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'")
    .replace(/&#x2F;/g,'/').replace(/&#\d+/g,m=>String.fromCharCode(parseInt(m.slice(2,-1),10)));
}
function extractText(xml,tag) {
  const m=xml.match(new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)</'+tag+'>'));
  return m?m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').trim():'';
}
function parseItems(xmlText) {
  const items=[];
  const re=/<item>([\s\S]*?)<\/item>/g;
  let m;
  while((m=re.exec(xmlText))!==null){
    const xml=m[1];
    let title=decodeEntities(extractText(xml,'title'));
    if(!title)continue;
    const link=extractText(xml,'link');
    let description=decodeEntities(extractText(xml,'description'));
    const pubDate=extractText(xml,'pubDate');
    let source=decodeEntities(extractText(xml,'source'));
    if(title.includes(' - ')){
      const parts=title.split(' - ');
      source=parts.pop()||source;
      title=parts.join(' - ');
    }
    description=decodeEntities(description).replace(/<[^>]*>/g,'').slice(0,200);
    items.push({title,link,pubDate,source:source||'???',description});
  }
  return items;
}

async function main(){
  let r=await fetch('https://rss.donga.com/health.xml',{headers:{'User-Agent':'Mozilla/5.0'}});
  let t=await r.text();
  let items=parseItems(t);
  console.log('Donga items: '+items.length);
  items.slice(0,2).forEach((it,i)=>console.log(i+':',it.title,'| source:',it.source,'| pubDate:',it.pubDate));

  r=await fetch('https://api.newswire.co.kr/rss/industry/1000',{headers:{'User-Agent':'Mozilla/5.0'}});
  t=await r.text();
  items=parseItems(t);
  console.log('Newswire items: '+items.length);
  items.slice(0,2).forEach((it,i)=>console.log(i+':',it.title?.slice(0,50),'| source:',it.source,'| pubDate:',it.pubDate));
}
main().then(()=>process.exit());
