# Requirements Document

## Introduzione

Local Events Finder è una webapp che geolocalizza l'utente e cerca eventi nella zona circostante, entro un raggio configurabile in chilometri. L'applicazione analizza siti web locali e pagine di locali/venue per identificare eventi in programma, li mostra su una mappa interattiva e utilizza un LLM per estrarre informazioni sugli eventi dal contenuto web e per suggerire all'utente cosa fare (ad esempio il sabato sera).

## Glossario

- **App**: L'applicazione web Local Events Finder
- **Utente**: La persona che utilizza l'applicazione
- **Geolocation_Service**: Il servizio che determina la posizione geografica dell'utente tramite le API del browser
- **Event_Scraper**: Il componente che analizza siti web e pagine di locali per estrarre informazioni sugli eventi
- **LLM_Engine**: Il componente basato su Large Language Model che identifica eventi dal contenuto web e genera raccomandazioni personalizzate
- **Map_View**: Il componente mappa interattiva che visualizza locali ed eventi
- **Venue**: Un locale, bar, teatro, sala concerti o qualsiasi luogo che ospita eventi
- **Evento**: Un'attività programmata (concerto, spettacolo, festa, mostra, ecc.) che si svolge in una Venue
- **Raggio_di_Ricerca**: La distanza massima in chilometri dal punto di geolocalizzazione dell'utente entro cui cercare eventi
- **Recommendation_Engine**: Il componente che utilizza l'LLM_Engine per suggerire eventi all'utente in base alle preferenze e al contesto

## Requisiti

### Requisito 1: Geolocalizzazione dell'utente

**User Story:** Come utente, voglio che l'app rilevi automaticamente la mia posizione, in modo da vedere eventi vicini a me senza dover inserire manualmente l'indirizzo.

#### Acceptance Criteria

1. WHEN l'utente apre l'App, THE Geolocation_Service SHALL richiedere il permesso di accesso alla posizione del browser
2. WHEN l'utente concede il permesso di geolocalizzazione, THE Geolocation_Service SHALL determinare la posizione dell'utente con una precisione di almeno 500 metri entro 5 secondi
3. IF l'utente nega il permesso di geolocalizzazione, THEN THE App SHALL mostrare un campo di input per inserire manualmente un indirizzo o una città
4. IF il Geolocation_Service non riesce a determinare la posizione entro 10 secondi, THEN THE App SHALL mostrare un messaggio di errore e offrire l'inserimento manuale dell'indirizzo
5. WHEN l'utente inserisce manualmente un indirizzo, THE Geolocation_Service SHALL geocodificare l'indirizzo in coordinate geografiche entro 5 secondi
6. IF l'indirizzo inserito manualmente non può essere geocodificato, THEN THE App SHALL mostrare un messaggio di errore indicante che l'indirizzo non è stato trovato e permettere all'utente di riprovare

### Requisito 2: Configurazione del raggio di ricerca

**User Story:** Come utente, voglio poter configurare il raggio di ricerca degli eventi, in modo da ampliare o restringere l'area in base alle mie esigenze.

#### Acceptance Criteria

1. THE App SHALL mostrare un controllo per impostare il Raggio_di_Ricerca con valori interi compresi tra 1 km e 100 km, con incrementi di 1 km
2. THE App SHALL impostare il Raggio_di_Ricerca predefinito a 15 km
3. WHEN l'utente modifica il Raggio_di_Ricerca, THE App SHALL aggiornare la lista degli eventi e la Map_View mostrando solo gli eventi entro il nuovo raggio, entro 3 secondi dalla modifica
4. IF l'utente tenta di impostare un valore del Raggio_di_Ricerca inferiore a 1 km o superiore a 100 km, THEN THE App SHALL impedire la modifica e mantenere l'ultimo valore valido
5. IF non vengono trovati eventi entro il Raggio_di_Ricerca configurato, THEN THE App SHALL mostrare un messaggio che indica l'assenza di eventi e suggerire di ampliare il raggio

### Requisito 3: Ricerca e scraping degli eventi

**User Story:** Come utente, voglio che l'app cerchi automaticamente eventi dai siti web locali e dalle pagine dei locali della zona, in modo da avere un elenco completo di cosa succede intorno a me.

#### Acceptance Criteria

1. WHEN la posizione dell'utente è determinata, THE Event_Scraper SHALL cercare eventi dai siti web e dalle pagine delle Venue entro il Raggio_di_Ricerca configurato, completando la ricerca entro 30 secondi
2. THE Event_Scraper SHALL estrarre da ogni evento le seguenti informazioni: nome dell'evento, data e ora, Venue, indirizzo, descrizione e categoria
3. WHEN l'Event_Scraper trova contenuto web non strutturato, THE LLM_Engine SHALL analizzare il contenuto per identificare ed estrarre informazioni sugli eventi
4. IF l'Event_Scraper non riesce ad accedere a un sito web entro 10 secondi (timeout di connessione), THEN THE App SHALL continuare la ricerca sugli altri siti disponibili senza interrompere il processo e registrare il fallimento nel log
5. THE Event_Scraper SHALL filtrare gli eventi mostrando solo quelli con data futura (entro i prossimi 30 giorni) o attualmente in corso (la cui ora di fine non è ancora passata)
6. IF l'LLM_Engine non riesce ad analizzare il contenuto di una pagina, THEN THE Event_Scraper SHALL saltare quella pagina e continuare con le fonti rimanenti
7. THE Event_Scraper SHALL identificare e rimuovere eventi duplicati basandosi su nome dell'evento, data e Venue

### Requisito 4: Visualizzazione mappa interattiva

**User Story:** Come utente, voglio vedere i locali e gli eventi su una mappa interattiva, in modo da capire dove si trovano rispetto alla mia posizione.

#### Acceptance Criteria

1. THE Map_View SHALL mostrare la posizione dell'utente con un marcatore distinto (colore blu) differente dai marcatori delle Venue
2. THE Map_View SHALL mostrare le Venue che ospitano eventi con marcatori colorati sulla mappa entro il Raggio_di_Ricerca, usando un colore diverso per ogni categoria di evento
3. WHEN l'utente clicca su un marcatore di una Venue, THE Map_View SHALL mostrare un popup con il nome della Venue, l'indirizzo e la lista degli eventi in programma con data e ora
4. THE Map_View SHALL mostrare un cerchio semi-trasparente che rappresenta il Raggio_di_Ricerca configurato attorno alla posizione dell'utente
5. WHEN l'utente modifica il Raggio_di_Ricerca, THE Map_View SHALL aggiornare il cerchio e i marcatori visibili entro 2 secondi
6. THE Map_View SHALL permettere all'utente di fare zoom e pan sulla mappa tramite gesti touch o mouse

### Requisito 5: Lista eventi e dettagli

**User Story:** Come utente, voglio vedere una lista degli eventi trovati con i dettagli, in modo da poter scegliere cosa fare.

#### Acceptance Criteria

1. THE App SHALL mostrare una lista degli eventi trovati ordinata per data e ora, visualizzando un massimo di 20 eventi per pagina con possibilità di caricare i successivi
2. THE App SHALL mostrare per ogni evento nella lista: nome, data e ora, nome della Venue, distanza dall'utente in chilometri e categoria
3. WHEN l'utente seleziona un evento dalla lista, THE App SHALL mostrare i dettagli dell'evento includendo: nome, data e ora, nome della Venue, indirizzo, categoria, descrizione testuale e un link cliccabile alla fonte originale
4. THE App SHALL permettere all'utente di filtrare gli eventi per categoria, intervallo di date e distanza massima, applicando i filtri in combinazione e aggiornando la lista entro 2 secondi
5. IF la ricerca non produce eventi nel Raggio_di_Ricerca configurato, THEN THE App SHALL mostrare un messaggio che indica l'assenza di eventi e suggerire di ampliare il Raggio_di_Ricerca
6. IF il link alla fonte originale di un evento non è raggiungibile, THEN THE App SHALL indicare che la fonte non è al momento disponibile

### Requisito 6: Raccomandazioni intelligenti tramite LLM

**User Story:** Come utente, voglio ricevere suggerimenti personalizzati su cosa fare stasera (o in qualsiasi momento), in modo da non dover cercare manualmente tra tutti gli eventi.

#### Acceptance Criteria

1. THE App SHALL mostrare un pulsante "Cosa faccio stasera?" per attivare le raccomandazioni
2. WHEN l'utente richiede una raccomandazione, THE Recommendation_Engine SHALL analizzare gli eventi disponibili e suggerire fino a 3 eventi entro 10 secondi, ciascuno con una spiegazione del motivo della raccomandazione basata sulla data e ora corrente, sulla distanza dall'utente e sulla categoria degli eventi
3. IF sono disponibili meno di 3 eventi corrispondenti ai criteri, THEN THE Recommendation_Engine SHALL restituire tutti gli eventi disponibili indicando che non sono stati trovati ulteriori risultati
4. WHEN l'utente interagisce con il Recommendation_Engine, THE LLM_Engine SHALL rispondere in linguaggio naturale in italiano
5. THE App SHALL permettere all'utente di specificare preferenze tramite un campo di testo libero di massimo 200 caratteri (es. "voglio musica dal vivo", "cerco qualcosa di gratuito") per affinare le raccomandazioni
6. IF il Recommendation_Engine non riesce a generare raccomandazioni entro 10 secondi o l'LLM_Engine non è disponibile, THEN THE App SHALL mostrare un messaggio di errore indicante l'indisponibilità del servizio e suggerire all'utente di riprovare

### Requisito 7: Interfaccia conversazionale con LLM

**User Story:** Come utente, voglio poter chattare con l'assistente per chiedere suggerimenti più specifici, in modo da trovare l'evento perfetto per me.

#### Acceptance Criteria

1. THE App SHALL mostrare un'interfaccia chat composta da un campo di input per il messaggio, un pulsante di invio e un'area di visualizzazione della cronologia dei messaggi per interagire con l'LLM_Engine
2. WHEN l'utente invia un messaggio nella chat con lunghezza compresa tra 1 e 500 caratteri, THE LLM_Engine SHALL rispondere entro 5 secondi con suggerimenti basati sugli eventi disponibili entro il Raggio_di_Ricerca configurato
3. THE LLM_Engine SHALL mantenere il contesto degli ultimi 20 messaggi della conversazione per tutta la durata della sessione browser dell'utente (fino alla chiusura della scheda o al refresh della pagina)
4. IF l'LLM_Engine non riesce a generare una risposta entro 5 secondi, THEN THE App SHALL mostrare un messaggio di errore indicante l'indisponibilità temporanea del servizio e suggerire all'utente di riprovare o riformulare la domanda
5. WHILE l'LLM_Engine sta elaborando una risposta, THE App SHALL mostrare un indicatore di caricamento nell'area chat
6. IF l'utente invia un messaggio vuoto o composto solo da spazi, THEN THE App SHALL mantenere disabilitato il pulsante di invio senza inviare il messaggio all'LLM_Engine

### Requisito 8: Gestione delle fonti dati

**User Story:** Come utente, voglio che l'app utilizzi fonti dati affidabili della mia zona, in modo da avere informazioni accurate sugli eventi.

#### Acceptance Criteria

1. THE App SHALL supportare l'aggiunta di URL di siti web locali come fonti per la ricerca eventi, fino a un massimo di 20 fonti personalizzate, ciascuna con URL di lunghezza massima 2048 caratteri
2. THE App SHALL includere almeno 3 fonti predefinite per piattaforme di eventi (es. Eventbrite, Facebook Events, pagine di comuni)
3. WHEN una nuova fonte viene aggiunta, THE Event_Scraper SHALL validare entro 10 secondi che l'URL sia raggiungibile e che l'LLM_Engine identifichi almeno un contenuto relativo a eventi nella pagina
4. IF la validazione di una nuova fonte fallisce perché l'URL non è raggiungibile o non contiene contenuti relativi a eventi, THEN THE App SHALL mostrare un messaggio di errore indicante il motivo del fallimento e non aggiungere la fonte alla lista
5. THE App SHALL mostrare la data e l'ora dell'ultimo aggiornamento riuscito per ogni fonte dati
6. THE App SHALL permettere all'utente di rimuovere fonti personalizzate dalla lista
