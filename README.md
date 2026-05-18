# 🎉 AiFun — Local Events Finder

Scopri eventi nella tua zona con mappa interattiva, AI assistant e notifiche Telegram.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![Express](https://img.shields.io/badge/Express-4.18-green) ![Ollama](https://img.shields.io/badge/Ollama-LLM-purple)

## ✨ Funzionalità

### 🗺️ Mappa & Eventi
- **Mappa interattiva** (Leaflet) con tema scuro/chiaro/satellite
- **Marker rossi** per ogni evento con popup informativo
- **Cerchio raggio** che si adatta allo slider (1-200km)
- **Marker draggabile** — trascina per cambiare posizione
- **Hover sync** — passa il mouse su un marker e l'evento si evidenzia nella lista
- **Ricerca per indirizzo** — inserisci qualsiasi città o via

### 📋 Lista Eventi
- Filtri per **categoria** (musica, teatro, sport, food, arte, ecc.)
- Filtro per **date** (da/a)
- Slider **raggio** con bottone "Cerca"
- **Modale dettaglio** con data, venue, indirizzo, descrizione, link alla fonte
- **🔔 Campanella** per salvare eventi e ricevere promemoria
- Link a **TicketOne** per cercare biglietti

### ✨ Assistente AI
- Chat con **Ollama** (LLM locale, nessun costo)
- Conosce gli eventi nella tua zona
- Fa raccomandazioni personalizzate
- Risponde a domande ("cosa c'è stasera?", "eventi per famiglie?")

### ⭐ Eventi Salvati
- Lista degli eventi salvati con la campanella
- Rimuovi con un click

### 📱 Notifiche Telegram
- Configurazione guidata del bot (passo-passo)
- Notifica automatica **il giorno prima** dell'evento salvato
- Test di connessione integrato

### 📡 Fonti
- **Eventbrite** — scraping automatico per coordinate + raggio
- **GenovaToday / MilanoToday / RomaToday / ecc.** — rete *Today.it con ricerca dinamica per città
- Ricerca multi-città automatica per raggi >40km
- Gestione fonti personalizzate

## 🚀 Installazione

### Prerequisiti
- Node.js 20 LTS
- (Opzionale) Ollama per l'assistente AI
- (Opzionale) Bot Telegram per le notifiche

### Setup

```bash
git clone https://github.com/giangibbar/aifun.git
cd aifun
npm install

# Configura il server
cp server/.env.example server/.env
nano server/.env  # Imposta LLM_BASE_URL, EVENTBRITE_TOKEN, ecc.

# Build
cd client && npx vite build && cd ..
cd server && npx tsc && cp src/db/schema.sql dist/db/ && cd ..

# Avvia
cd server && node dist/index.js
```

Apri **http://localhost:3001** nel browser.

### Variabili d'ambiente (server/.env)

```env
PORT=3001
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen2.5:1.5b
OPENAI_API_KEY=ollama
EVENTBRITE_TOKEN=your_token_here
TELEGRAM_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Deploy su Raspberry Pi 4

```bash
# Installa Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Installa Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:1.5b

# Crea servizio systemd
sudo tee /etc/systemd/system/aifun.service > /dev/null << EOF
[Unit]
Description=AiFun - Local Events Finder
After=network.target ollama.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/AiFun/server
ExecStart=/usr/bin/node --max-old-space-size=512 dist/index.js
Restart=always
RestartSec=5
EnvironmentFile=$HOME/AiFun/server/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now aifun
```

## 📁 Struttura

```
aifun/
├── package.json              # Workspaces monorepo
├── tsconfig.base.json        # TypeScript config condiviso
├── client/                   # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx           # Layout principale
│   │   ├── components/       # MapView, EventList, ChatInterface, ecc.
│   │   ├── contexts/         # GeolocationContext
│   │   ├── api/              # Client API tipizzato
│   │   └── utils/            # Colori categorie
│   └── vite.config.ts
└── server/                   # Express + SQLite + Cheerio
    ├── src/
    │   ├── index.ts          # Entry point + static serving
    │   ├── routes/           # events, chat, sources, geocode, reminders
    │   ├── services/         # EventbriteService, TodayScraperService, LLMService, ecc.
    │   ├── db/               # SQLite schema + getDatabase()
    │   ├── types/            # Interfacce condivise
    │   └── utils/            # Validazione, geo, filtri, paginazione
    └── .env.example
```

## 🛠️ Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Leaflet |
| Backend | Express, TypeScript, better-sqlite3 |
| Scraping | Cheerio (HTML parsing, JSON-LD extraction) |
| AI | Ollama (qwen2.5:1.5b) via OpenAI SDK |
| Notifiche | Telegram Bot API |
| Maps | Leaflet + CartoDB/OSM/Esri tiles |
| Testing | Vitest + fast-check |

## 📡 Come funziona lo scraping

### Eventbrite
- Raggio ≤30km: cerca per nome città (`/d/italy--genova/events/`)
- Raggio >30km: cerca per coordinate (`?loc=44.4,8.9&distance=100km`)
- Estrae JSON-LD (`__SERVER_DATA__`) dalla pagina
- Filtra per distanza reale (haversine)

### *Today.it (GenovaToday, MilanoToday, ecc.)
- Raggio ≤40km: scrape solo la città principale
- Raggio >40km: usa Nominatim per trovare città nel raggio, scrape in parallelo
- Estrae titoli + link dalla pagina lista eventi settimanali
- Funziona per qualsiasi città italiana con un sito *Today

## 📄 License

MIT
