// 실시간 태양광 자료 (Netlify Function, 경로 /api/live)
// - 육지 SMP: 전력거래소 공개 화면 (최근 7일 · 시간대별)
// - 전국 20개 도시 일사량 · 날씨 예보: Open-Meteo (경사면 일사량, 3일)
// - 뉴스: Google 뉴스 RSS (업계 · 정책/지원)
// 응답은 CDN에 15분 보관하고, 원본이 실패하면 그 항목만 비워 보낸다.
// 로컬 확인: node -e "import('./site/functions/live.mjs').then(async m => console.log(JSON.stringify(await m.collect()).slice(0, 400)))"

const UA = "Mozilla/5.0 (compatible; solar-whitepaper-live/1.0)";
const LAT = 35.95, LON = 126.62; // 군산 국가산업단지
const NEWS = {
  news: "태양광 when:7d",
  policy: "(태양광 OR 재생에너지) (보급사업 OR 지원사업 OR 보조금 OR RPS OR 고시 OR 공고 OR 전력시장) when:14d",
};

async function get(url, ms = 9000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "*/*" }, signal: ac.signal });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return await r.text();
  } finally { clearTimeout(t); }
}
const strip = (h) => h.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const ent = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");

export async function getSmp() {
  const html = await get("https://new.kpx.or.kr/smpInland.es?mid=a10606080100&device=pc");
  const i = html.indexOf("<table"); if (i < 0) throw new Error("SMP 표 없음");
  const t = html.slice(i, html.indexOf("</table>", i));
  const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => strip(c[1])));
  const head = rows.find((r) => r[0] === "구분"); if (!head) throw new Error("SMP 머리글 없음");
  const days = head.slice(1).map((d) => { const m = d.match(/(\d{1,2})\.(\d{1,2})\s*\(?([^)]*)\)?/); return m ? { md: `${+m[1]}.${+m[2]}`, dow: m[3] } : { md: d, dow: "" }; });
  const num = (x) => { const v = parseFloat(String(x).replace(/,/g, "")); return isFinite(v) ? v : null; };
  const hourly = days.map(() => []);
  const stat = { max: [], min: [], avg: [] };
  for (const r of rows) {
    const k = r[0];
    if (/^\d{1,2}h$/.test(k)) r.slice(1).forEach((v, d) => { hourly[d][parseInt(k, 10) - 1] = num(v); });
    else if (k === "최대") stat.max = r.slice(1).map(num);
    else if (k === "최소") stat.min = r.slice(1).map(num);
    else if (/평균/.test(k)) stat.avg = r.slice(1).map(num);
  }
  if (!hourly.some((h) => h.length >= 20)) throw new Error("SMP 시간대 값 없음");
  return { unit: "원/kWh", days: days.map((d, k) => ({ ...d, hourly: hourly[k], max: stat.max[k] ?? null, min: stat.min[k] ?? null, avg: stat.avg[k] ?? null })), source: "전력거래소 육지 SMP", url: "https://new.kpx.or.kr/smpInland.es?mid=a10606080100&device=pc" };
}

// 전국 주요 도시 (gx, gy: 화면 격자 지도 위치)
export const CITIES = [
  ["인천", 37.456, 126.705, 0, 0], ["서울", 37.566, 126.978, 1, 0], ["춘천", 37.881, 127.730, 2, 0], ["강릉", 37.752, 128.876, 3, 0],
  ["서산", 36.785, 126.450, 0, 1], ["수원", 37.263, 127.029, 1, 1], ["청주", 36.642, 127.489, 2, 1], ["안동", 36.568, 128.729, 3, 1],
  ["군산", LAT, LON, 0, 2], ["대전", 36.351, 127.385, 1, 2], ["대구", 35.871, 128.601, 3, 2], ["포항", 36.019, 129.343, 4, 2],
  ["전주", 35.825, 127.148, 1, 3], ["진주", 35.180, 128.108, 2, 3], ["창원", 35.228, 128.681, 3, 3], ["울산", 35.538, 129.311, 4, 3],
  ["광주", 35.160, 126.852, 0, 4], ["부산", 35.180, 129.075, 4, 4], ["목포", 34.812, 126.392, 0, 5], ["제주", 33.499, 126.531, 1, 6],
];

export async function getWeather() {
  const q = new URLSearchParams({
    latitude: CITIES.map((c) => c[1]).join(","), longitude: CITIES.map((c) => c[2]).join(","), timezone: "Asia/Seoul", forecast_days: "3",
    hourly: "global_tilted_irradiance,shortwave_radiation,cloud_cover,temperature_2m,precipitation_probability",
    daily: "sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min",
    current: "temperature_2m,cloud_cover,weather_code,shortwave_radiation,wind_speed_10m",
    tilt: "10", azimuth: "0",
  });
  let arr = JSON.parse(await get(`https://api.open-meteo.com/v1/forecast?${q}`, 15000));
  if (!Array.isArray(arr)) arr = [arr];
  const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
  const cities = CITIES.map(([name, lat, lon, gx, gy], i) => {
    const j = arr[i] || {}, h = j.hourly || {};
    return { name, lat, lon, gx, gy, current: j.current,
      hourly: { gti: (h.global_tilted_irradiance || []).map(r1), ghi: (h.shortwave_radiation || []).map(r1), cloud: h.cloud_cover || [], temp: (h.temperature_2m || []).map(r1), pop: h.precipitation_probability || [] },
      daily: j.daily };
  });
  const time = (arr[0] && arr[0].hourly && arr[0].hourly.time) || [];
  const g = cities.find((c) => c.name === "군산");
  // 군산(현장 위치)은 예전 형식으로도 내보낸다
  return { place: "군산 국가산업단지", tilt: 10, time, cities,
    current: g.current, daily: g.daily,
    hourly: { time, global_tilted_irradiance: g.hourly.gti, shortwave_radiation: g.hourly.ghi, cloud_cover: g.hourly.cloud, temperature_2m: g.hourly.temp, precipitation_probability: g.hourly.pop },
    source: "Open-Meteo 예보 (전국 20개 도시)", url: "https://open-meteo.com/" };
}

export async function getNews(query, n = 10) {
  const xml = await get(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`);
  const out = []; const seen = new Set();
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1], tag = (k) => { const x = it.match(new RegExp(`<${k}[^>]*>([\\s\\S]*?)<\\/${k}>`)); return x ? ent(x[1]).trim() : ""; };
    const source = tag("source");
    let title = tag("title"); if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const key = title.replace(/\s+/g, "").slice(0, 40); if (!title || seen.has(key)) continue; seen.add(key);
    out.push({ title, link: tag("link"), source, date: new Date(tag("pubDate")).toISOString() });
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out.slice(0, n);
}

export async function collect() {
  const jobs = { smp: getSmp(), weather: getWeather(), news: getNews(NEWS.news), policy: getNews(NEWS.policy) };
  const res = await Promise.allSettled(Object.values(jobs));
  const body = { updated: new Date().toISOString(), errors: {} };
  Object.keys(jobs).forEach((k, i) => { if (res[i].status === "fulfilled") body[k] = res[i].value; else { body[k] = null; body.errors[k] = String(res[i].reason && res[i].reason.message || res[i].reason); } });
  return body;
}

export default async () => {
  const body = await collect();
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
      "netlify-cdn-cache-control": "public, durable, s-maxage=900, stale-while-revalidate=3600",
      "access-control-allow-origin": "*",
    },
  });
};

export const config = { path: "/api/live" };
