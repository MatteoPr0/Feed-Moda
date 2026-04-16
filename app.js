const FEED_SOURCES = [
  { name: "Hypebeast Style", rss: "https://hypebeast.com/feed", topic: "fashion" },
  { name: "Dezeen Interiors", rss: "https://www.dezeen.com/interiors/feed/", topic: "interior" },
  { name: "Highsnobiety", rss: "https://www.highsnobiety.com/feed/", topic: "fashion" },
  { name: "Designboom", rss: "https://www.designboom.com/feed/", topic: "interior" },
];

const TASTE_PROFILE = {
  loves: [
    "minimal",
    "relaxed",
    "tailoring",
    "outerwear",
    "texture",
    "premium",
    "iconic",
    "timeless",
    "contemporary",
    "clean",
    "wearable",
    "affordable luxury",
    "functional",
    "scandinavian",
    "editorial",
    "design",
  ],
  brands: [
    "cos",
    "arket",
    "uniqlo",
    "our legacy",
    "ami paris",
    "lemaire",
    "auralee",
    "studio nicholson",
    "sunflower",
    "mfpen",
    "acne studios",
    "dries van noten",
    "seletti",
    "kartell",
    "alessi",
    "ichendorf",
    "smeg",
    "hay",
    "muuto",
    "ferm living",
    "artemide",
    "flos",
    "ikea",
  ],
  avoid: ["over logo", "hype only", "kitsch", "maximal loud", "gaudy"],
};

const localFallback = [
  {
    title: "5 pantaloni relaxed ma impeccabili per un guardaroba premium vivibile",
    excerpt: "Silhouette pulite, texture ricche e proporzioni moderne senza eccessi rumorosi.",
    url: "https://www.cos.com/",
    source: "Feed Moda Picks",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    tags: ["moda uomo", "relaxed tailoring", "clean"],
  },
  {
    title: "Oggetti wow ma funzionali: 8 pezzi interior con carattere (e senso)",
    excerpt: "Dal lighting statement agli accessori da tavola iconici: impatto estetico + praticità.",
    url: "https://www.muuto.com/",
    source: "Feed Moda Picks",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    tags: ["interior", "iconic", "smart picks"],
  },
  {
    title: "Lusso accessibile: alternative intelligenti ai pezzi designer più desiderati",
    excerpt: "Una guida tra brand premium e basi furbe che sembrano molto più costose.",
    url: "https://www.arket.com/",
    source: "Feed Moda Picks",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
    tags: ["affordable luxury", "editorial", "essentials"],
  },
];

const feedGrid = document.querySelector("#feedGrid");
const cardTemplate = document.querySelector("#cardTemplate");
const refreshBtn = document.querySelector("#refreshBtn");
const statsLine = document.querySelector("#statsLine");
const toggleModeBtn = document.querySelector("#toggleModeBtn");
const installBtn = document.querySelector("#installBtn");

let deferredPrompt;

const cleanText = (html = "") =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getKeywords = (item) => {
  const joined = `${item.title} ${item.excerpt} ${(item.tags || []).join(" ")}`.toLowerCase();
  return joined;
};

const computeScore = (item) => {
  const text = getKeywords(item);

  let score = 0;

  for (const k of TASTE_PROFILE.loves) {
    if (text.includes(k)) score += 8;
  }

  for (const b of TASTE_PROFILE.brands) {
    if (text.includes(b)) score += 16;
  }

  for (const bad of TASTE_PROFILE.avoid) {
    if (text.includes(bad)) score -= 12;
  }

  if (item.topic === "fashion") score += 4;
  if (item.topic === "interior") score += 4;

  return Math.max(score, 0);
};

const extractImage = (entry) => {
  if (entry.thumbnail) return entry.thumbnail;
  const match = entry.description?.match(/<img[^>]+src="([^"]+)"/i);
  return (
    match?.[1] ||
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80"
  );
};

async function fetchSource(source) {
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.rss)}&count=8`;

  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`RSS fetch failed: ${source.name}`);

  const data = await response.json();
  const items = data.items || [];

  return items.map((entry) => ({
    title: entry.title,
    excerpt: cleanText(entry.description).slice(0, 170) + "…",
    url: entry.link,
    source: source.name,
    topic: source.topic,
    image: extractImage(entry),
    tags: (entry.categories || []).slice(0, 3),
    publishedAt: entry.pubDate,
  }));
}

function drawFeed(items) {
  feedGrid.innerHTML = "";

  const sorted = items
    .map((item) => ({ ...item, score: computeScore(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  sorted.forEach((item, index) => {
    const fragment = cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".feed-card");
    const cover = fragment.querySelector(".cover");

    if (index < 3) card.classList.add("top-match");

    cover.src = item.image;
    cover.alt = item.title;
    fragment.querySelector(".source").textContent = item.source;
    fragment.querySelector(".score").textContent = `match ${item.score}`;
    fragment.querySelector(".title").textContent = item.title;
    fragment.querySelector(".excerpt").textContent = item.excerpt;

    const tagsNode = fragment.querySelector(".tags");
    (item.tags || []).forEach((tag) => {
      const el = document.createElement("span");
      el.className = "tag";
      el.textContent = tag.toLowerCase();
      tagsNode.appendChild(el);
    });

    const link = fragment.querySelector(".read-link");
    link.href = item.url;

    feedGrid.appendChild(fragment);
  });

  const best = sorted[0]?.title || "Nessun risultato";
  statsLine.textContent = `Top match: ${best}. Segnali di gusto attivi: ${TASTE_PROFILE.loves.length + TASTE_PROFILE.brands.length}.`;
}

async function buildFeed() {
  statsLine.textContent = "Scansione fonti moda/design…";

  try {
    const collections = await Promise.allSettled(FEED_SOURCES.map(fetchSource));
    const ok = collections.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);

    if (ok.length < 5) throw new Error("Not enough remote items");

    drawFeed(ok);
  } catch {
    drawFeed(localFallback);
    statsLine.textContent = "Modalità offline editoriale: feed curato locale (fonti remote non disponibili).";
  }
}

refreshBtn.addEventListener("click", buildFeed);
toggleModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("focus-mode");
  toggleModeBtn.textContent = document.body.classList.contains("focus-mode")
    ? "Modalità completa"
    : "Modalità focus";
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

buildFeed();
