const FEED_SOURCES = [
  { name: "Hypebeast Style", rss: "https://hypebeast.com/feed", topic: "fashion" },
  { name: "Dezeen Interiors", rss: "https://www.dezeen.com/interiors/feed/", topic: "interior" },
  { name: "Highsnobiety", rss: "https://www.highsnobiety.com/feed/", topic: "fashion" },
  { name: "Designboom", rss: "https://www.designboom.com/feed/", topic: "interior" },
];

const DEFAULT_TASTE_PROFILE = {
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
let TASTE_PROFILE = structuredClone(DEFAULT_TASTE_PROFILE);
const TASTE_PROFILE_KEY = "feed-moda:taste-profile:v1";

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
const lovesInput = document.querySelector("#lovesInput");
const brandsInput = document.querySelector("#brandsInput");
const avoidInput = document.querySelector("#avoidInput");
const savePrefsBtn = document.querySelector("#savePrefsBtn");
const navItems = [...document.querySelectorAll(".nav-item")];

let deferredPrompt;
let currentSection = "home";
let feedItems = [...localFallback];
let savedItems = [];
const SAVED_ITEMS_KEY = "feed-moda:saved-items:v1";

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
  const xmlEndpoints = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(source.rss)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(source.rss)}`,
    source.rss,
  ];

  const jsonEndpoints = [
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.rss)}`,
    `https://rss2json.com/api.json?rss_url=${encodeURIComponent(source.rss)}`,
  ];

  let xmlText = "";
  for (const endpoint of xmlEndpoints) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) continue;
      xmlText = await response.text();
      if (xmlText?.trim()) break;
    } catch {
      // continua con il prossimo endpoint
    }
  }

  if (!xmlText?.trim()) {
    for (const endpoint of jsonEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;
        const json = await response.json();
        const items = (json?.items || []).slice(0, 8);
        if (!items.length) continue;

        return items.map((entry) => ({
          title: entry.title || "Untitled",
          excerpt: `${cleanText(entry.description || entry.content || "").slice(0, 170)}…`,
          url: entry.link || source.rss,
          source: source.name,
          topic: source.topic,
          image:
            entry.thumbnail ||
            extractImage({
              thumbnail: "",
              description: entry.description || entry.content,
            }),
          tags: (entry.categories || []).filter(Boolean).slice(0, 3),
          publishedAt: entry.pubDate || "",
        }));
      } catch {
        // continua con il prossimo endpoint JSON
      }
    }
  }

  if (!xmlText?.trim()) throw new Error(`RSS fetch failed: ${source.name}`);

  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  const hasError = xml.querySelector("parsererror");
  if (hasError) throw new Error(`RSS parse failed: ${source.name}`);

  const rssItems = [...xml.querySelectorAll("rss > channel > item")];
  const atomItems = [...xml.querySelectorAll("feed > entry")];
  const nodes = [...rssItems, ...atomItems].slice(0, 8);

  const pickText = (parent, selectors) => {
    for (const selector of selectors) {
      const node = parent.querySelector(selector);
      if (node?.textContent?.trim()) return node.textContent.trim();
    }
    return "";
  };

  const pickLink = (parent) => {
    const rssLink = parent.querySelector("link")?.textContent?.trim();
    if (rssLink?.startsWith("http")) return rssLink;

    const atomHref =
      parent.querySelector("link[rel='alternate']")?.getAttribute("href") ||
      parent.querySelector("link")?.getAttribute("href");
    if (atomHref?.startsWith("http")) return atomHref;

    return source.rss;
  };

  return nodes.map((entry) => {
    const title = pickText(entry, ["title"]) || "Untitled";
    const description = pickText(entry, [
      "description",
      "content",
      "content\\:encoded",
      "summary",
    ]);
    const imageFromMedia =
      entry.querySelector("media\\:content")?.getAttribute("url") ||
      entry.querySelector("enclosure[type^='image']")?.getAttribute("url");

    return {
      title,
      excerpt: `${cleanText(description).slice(0, 170)}…`,
      url: pickLink(entry),
      source: source.name,
      topic: source.topic,
      image:
        imageFromMedia ||
        extractImage({
          thumbnail: "",
          description,
        }),
      tags: [
        ...new Set(
          [...entry.querySelectorAll("category")]
            .map((category) => category.textContent?.trim())
            .filter(Boolean)
        ),
      ].slice(0, 3),
      publishedAt: pickText(entry, ["pubDate", "published", "updated"]),
    };
  });
}

function drawFeed(items) {
  feedGrid.innerHTML = "";

  const sorted = items
    .map((item) => ({ ...item, score: computeScore(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  if (!sorted.length) {
    feedGrid.innerHTML = `
      <article class="card empty-state">
        <h4>Nessun contenuto da mostrare</h4>
        <p>Prova a cambiare sezione o aggiorna il feed.</p>
      </article>
    `;
    statsLine.textContent = "Nessun contenuto disponibile per questa sezione.";
    return;
  }

  sorted.forEach((item, index) => {
    const fragment = cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".feed-card");
    const cover = fragment.querySelector(".cover");
    const saveBtn = fragment.querySelector(".save-btn");

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

    const isSaved = savedItems.some((saved) => saved.url === item.url);
    saveBtn.textContent = isSaved ? "Salvato" : "Salva";
    if (isSaved) saveBtn.classList.add("is-saved");
    saveBtn.addEventListener("click", () => {
      toggleSaved(item);
      renderCurrentSection();
    });

    feedGrid.appendChild(fragment);
  });

  const sectionLabel = {
    home: "Home",
    fashion: "Moda Uomo",
    interior: "Interior",
    saved: "Saved",
  }[currentSection];
  const best = sorted[0]?.title || "Nessun risultato";
  statsLine.textContent = `${sectionLabel}: ${sorted.length} articoli. Top match: ${best}. Segnali attivi: ${TASTE_PROFILE.loves.length + TASTE_PROFILE.brands.length}.`;
}

const csvToList = (value) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

function hydratePreferenceForm() {
  lovesInput.value = TASTE_PROFILE.loves.join(", ");
  brandsInput.value = TASTE_PROFILE.brands.join(", ");
  avoidInput.value = TASTE_PROFILE.avoid.join(", ");
}

function loadPreferences() {
  try {
    const stored = localStorage.getItem(TASTE_PROFILE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    TASTE_PROFILE = {
      loves: Array.isArray(parsed?.loves) ? parsed.loves : DEFAULT_TASTE_PROFILE.loves,
      brands: Array.isArray(parsed?.brands) ? parsed.brands : DEFAULT_TASTE_PROFILE.brands,
      avoid: Array.isArray(parsed?.avoid) ? parsed.avoid : DEFAULT_TASTE_PROFILE.avoid,
    };
  } catch {
    TASTE_PROFILE = structuredClone(DEFAULT_TASTE_PROFILE);
  }
}

function loadSavedItems() {
  try {
    const stored = localStorage.getItem(SAVED_ITEMS_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    savedItems = Array.isArray(parsed) ? parsed.filter((item) => item?.url) : [];
  } catch {
    savedItems = [];
  }
}

function persistSavedItems() {
  localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(savedItems));
}

function toggleSaved(item) {
  const index = savedItems.findIndex((saved) => saved.url === item.url);
  if (index >= 0) {
    savedItems.splice(index, 1);
  } else {
    savedItems.unshift(item);
  }
  persistSavedItems();
}

function getItemsForSection() {
  if (currentSection === "saved") return savedItems;
  if (currentSection === "fashion") return feedItems.filter((item) => item.topic === "fashion");
  if (currentSection === "interior") return feedItems.filter((item) => item.topic === "interior");
  return feedItems;
}

function setActiveNav() {
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.section === currentSection);
  });
}

function renderCurrentSection() {
  setActiveNav();
  drawFeed(getItemsForSection());
}

async function buildFeed() {
  statsLine.textContent = "Scansione fonti moda/design…";

  try {
    const collections = await Promise.allSettled(FEED_SOURCES.map(fetchSource));
    const ok = collections.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
    const sourcesOk = collections.filter((r) => r.status === "fulfilled").length;

    if (ok.length < 5) throw new Error("Not enough remote items");

    feedItems = ok;
    renderCurrentSection();
    statsLine.textContent = `Feed live online: ${sourcesOk}/${FEED_SOURCES.length} fonti aggiornate ora.`;
  } catch {
    feedItems = [...localFallback];
    renderCurrentSection();
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

savePrefsBtn.addEventListener("click", () => {
  TASTE_PROFILE = {
    loves: csvToList(lovesInput.value),
    brands: csvToList(brandsInput.value),
    avoid: csvToList(avoidInput.value),
  };
  localStorage.setItem(TASTE_PROFILE_KEY, JSON.stringify(TASTE_PROFILE));
  buildFeed();
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    currentSection = item.dataset.section || "home";
    renderCurrentSection();
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

loadPreferences();
loadSavedItems();
hydratePreferenceForm();
buildFeed();
