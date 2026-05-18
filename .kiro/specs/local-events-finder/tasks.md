# Implementation Plan: Local Events Finder

## Overview

Implementazione di una webapp SPA che geolocalizza l'utente, cerca eventi nella zona circostante tramite scraping + LLM, li visualizza su mappa interattiva e offre raccomandazioni intelligenti via chat. Stack: React 18 + TypeScript (frontend), Node.js + Express + TypeScript (backend), SQLite, OpenAI API, Leaflet, fast-check.

## Tasks

- [x] 1. Set up project structure and core configuration
  - [x] 1.1 Initialize monorepo with frontend and backend packages
    - Create root `package.json` with workspaces for `client/` and `server/`
    - Initialize `client/` with Vite + React 18 + TypeScript template
    - Initialize `server/` with TypeScript + Express
    - Configure shared `tsconfig.json` base settings
    - Install core dependencies: `express`, `better-sqlite3`, `react`, `react-dom`, `leaflet`, `tailwindcss`
    - _Requirements: All (project foundation)_

  - [x] 1.2 Define shared TypeScript interfaces and types
    - Create `server/src/types/` with all interfaces from design: `Event`, `EventSummary`, `EventCategory`, `Source`, `Venue`, `Recommendation`, `ChatMessage`
    - Create request/response interfaces: `SearchEventsRequest`, `SearchEventsResponse`, `RecommendationRequest`, `RecommendationResponse`, `ChatRequest`, `ChatResponse`
    - _Requirements: 3.2, 5.2, 6.2, 7.2_

  - [x] 1.3 Set up SQLite database schema and initialization
    - Create `server/src/db/schema.sql` with tables: `sources`, `events`, `scrape_logs`
    - Create `server/src/db/index.ts` with database initialization using `better-sqlite3`
    - Include all indexes: `idx_events_coords`, `idx_events_date`, `idx_events_category`, `idx_events_source`
    - Seed default sources (Eventbrite, Facebook Events, pagine comuni)
    - _Requirements: 8.2, 3.4_

  - [x] 1.4 Set up testing framework
    - Configure Vitest for both `client/` and `server/`
    - Install `fast-check` for property-based testing
    - Install `@testing-library/react` for component tests
    - Create test directory structure: `__tests__/properties/`, `__tests__/unit/`, `__tests__/integration/`
    - _Requirements: All (testing infrastructure)_

- [x] 2. Implement core utility functions
  - [x] 2.1 Implement Haversine distance calculation
    - Create `server/src/utils/geo.ts` with `haversineDistanceKm(lat1, lng1, lat2, lng2)` function
    - Implement `toRad()` helper
    - _Requirements: 2.3, 5.2_

  - [ ]* 2.2 Write property test for distance filtering (Property 2)
    - **Property 2: Filtraggio eventi per distanza**
    - Test that `filterByDistance` returns exactly events within radius and excludes those outside
    - Use generators: array of events with random coordinates, random center position, radius 1-100
    - **Validates: Requirements 2.3**

  - [x] 2.3 Implement radius validation function
    - Create `server/src/utils/validation.ts` with `validateRadius(value)` function
    - Accept only integers between 1 and 100 inclusive
    - Reject decimals, non-numeric values, out-of-range values
    - _Requirements: 2.1, 2.4_

  - [ ]* 2.4 Write property test for radius validation (Property 1)
    - **Property 1: Validazione del raggio di ricerca**
    - Test that `validateRadius` accepts integers 1-100 and rejects everything else
    - Use generators: arbitrary integers, floats, strings
    - **Validates: Requirements 2.1, 2.4**

  - [x] 2.5 Implement date filtering function
    - Create `server/src/utils/dateFilter.ts` with `filterByDate(events, now)` function
    - Include events with start date within 30 days from now
    - Include currently ongoing events (start ≤ now AND end > now or end null with start today)
    - Exclude past events and events > 30 days in future
    - _Requirements: 3.5_

  - [ ]* 2.6 Write property test for date filtering (Property 3)
    - **Property 3: Filtraggio eventi per data**
    - Test inclusion/exclusion logic for past, present, future, and >30 day events
    - Use generators: array of events with random dates (past, present, future, >30 days)
    - **Validates: Requirements 3.5**

  - [x] 2.7 Implement event deduplication function
    - Create `server/src/utils/deduplication.ts` with `deduplicateEvents(events)` function
    - Normalize: lowercase, trim, remove punctuation for name and venue
    - Compare same day for date
    - Preserve exactly one event per duplicate group
    - _Requirements: 3.7_

  - [ ]* 2.8 Write property test for deduplication (Property 4)
    - **Property 4: Deduplicazione eventi**
    - Test that output has no duplicates and preserves exactly one per group
    - Use generators: array of events with intentional duplicates
    - **Validates: Requirements 3.7**

  - [x] 2.9 Implement pagination function
    - Create `server/src/utils/pagination.ts` with `paginateEvents(events, page, pageSize)` function
    - Return correct slice, hasMore flag, total count
    - Default pageSize = 20
    - _Requirements: 5.1_

  - [ ]* 2.10 Write property test for pagination (Property 7)
    - **Property 7: Correttezza paginazione**
    - Test correct slice, hasMore, total for variable-length arrays and page numbers
    - Use generators: arrays of variable length, page numbers ≥ 1
    - **Validates: Requirements 5.1**

  - [x] 2.11 Implement combined filters function
    - Create `server/src/utils/filters.ts` with `applyFilters(events, filters)` function
    - Support filtering by categories, date range, max distance
    - Apply all active filters simultaneously (AND logic)
    - _Requirements: 5.4_

  - [ ]* 2.12 Write property test for combined filters (Property 8)
    - **Property 8: Correttezza filtri combinati**
    - Test that result contains exactly events satisfying ALL active filters
    - Use generators: array of events, combinations of filters
    - **Validates: Requirements 5.4**

- [x] 3. Checkpoint - Core utilities
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement validation functions
  - [x] 4.1 Implement preferences validation
    - Create `server/src/utils/validatePreferences.ts` with `validatePreferences(input)` function
    - Accept strings with length ≤ 200 characters
    - Reject strings > 200 characters
    - _Requirements: 6.5_

  - [ ]* 4.2 Write property test for preferences validation (Property 10)
    - **Property 10: Validazione input preferenze**
    - Test acceptance/rejection based on string length threshold of 200
    - Use generators: strings of length 0-300
    - **Validates: Requirements 6.5**

  - [x] 4.3 Implement chat message validation
    - Create `server/src/utils/validateChat.ts` with `validateChatMessage(input)` function
    - Accept strings where `trim().length` is between 1 and 500 inclusive
    - Reject empty, whitespace-only, or trimmed > 500 character strings
    - _Requirements: 7.2, 7.6_

  - [ ]* 4.4 Write property test for chat validation (Property 11)
    - **Property 11: Validazione input chat**
    - Test acceptance/rejection based on trimmed length 1-500
    - Use generators: strings with spaces, empty, long, normal
    - **Validates: Requirements 7.2, 7.6**

  - [x] 4.5 Implement conversation history trimming
    - Create `server/src/utils/conversationHistory.ts` with `trimConversationHistory(messages)` function
    - Return at most last 20 messages, preserving chronological order
    - If ≤ 20, return all; if > 20, return last 20
    - _Requirements: 7.3_

  - [ ]* 4.6 Write property test for conversation history (Property 12)
    - **Property 12: Finestra contesto conversazione**
    - Test that output has at most 20 messages and preserves order
    - Use generators: arrays of messages of length 0-50
    - **Validates: Requirements 7.3**

  - [x] 4.7 Implement source addition validation
    - Create `server/src/utils/validateSource.ts` with `validateSourceAddition(url, currentCount)` function
    - Accept if: valid URL with http/https schema, length ≤ 2048, currentCount < 20
    - Reject if any condition fails
    - _Requirements: 8.1_

  - [ ]* 4.8 Write property test for source validation (Property 13)
    - **Property 13: Validazione aggiunta fonti**
    - Test acceptance/rejection based on URL validity, length, and count
    - Use generators: valid/invalid URLs, counts 0-25
    - **Validates: Requirements 8.1**

- [ ] 5. Implement backend services
  - [ ] 5.1 Implement GeocodingService
    - Create `server/src/services/GeocodingService.ts`
    - Integrate with Nominatim API for address-to-coordinates conversion
    - Implement 5-second timeout for geocoding requests
    - Handle errors: address not found, timeout, service unavailable
    - _Requirements: 1.5, 1.6_

  - [ ] 5.2 Implement LLMService
    - Create `server/src/services/LLMService.ts`
    - Integrate with OpenAI API (GPT-4o-mini)
    - Implement `extractEvents(htmlContent)` method with structured prompt for event extraction
    - Implement `generateRecommendations(events, preferences)` method
    - Implement `chat(message, history, context)` method
    - Implement retry policy: 1 retry with 2s exponential backoff for 5xx errors
    - Handle timeouts: 5s for chat, 10s for recommendations
    - _Requirements: 3.3, 6.2, 7.2_

  - [ ] 5.3 Implement EventScraperService
    - Create `server/src/services/EventScraperService.ts`
    - Implement page fetching with Cheerio (static) and Puppeteer (dynamic)
    - Set 10-second timeout per source
    - On timeout/error: skip source, log to `scrape_logs`, continue with others
    - Call LLMService for event extraction from unstructured content
    - Apply deduplication and date filtering to results
    - Cache results in SQLite with 1-hour TTL
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 5.4 Write property test for event parsing completeness (Property 5)
    - **Property 5: Completezza estrazione eventi**
    - Test that parsed events have all required fields or are discarded
    - Use generators: JSON objects with present/missing fields
    - **Validates: Requirements 3.2**

  - [ ] 5.5 Implement RecommendationService
    - Create `server/src/services/RecommendationService.ts`
    - Filter available events by current time, distance, and user preferences
    - Build prompt for LLM with event context
    - Format output: max 3 recommendations, each with event and reason in Italian
    - Handle < 3 events case: return all available
    - Implement 10-second timeout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 5.6 Write property test for recommendation output (Property 9)
    - **Property 9: Vincoli output raccomandazioni**
    - Test that output has at most 3 recommendations with valid event and non-empty reason
    - Use generators: arrays of events of length 0-10
    - **Validates: Requirements 6.2, 6.3**

  - [ ] 5.7 Implement SourceService
    - Create `server/src/services/SourceService.ts`
    - CRUD operations for sources in SQLite
    - Validate URL reachability and event content detection via LLM
    - Enforce max 20 custom sources limit
    - Track last scraped timestamp and status
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 5.8 Implement CacheService
    - Create `server/src/services/CacheService.ts`
    - Check if cached events exist and are < 1 hour old for given position/radius
    - Store and retrieve events from SQLite
    - Invalidate stale cache entries
    - _Requirements: 3.1 (performance)_

- [ ] 6. Implement REST API layer
  - [ ] 6.1 Set up Express server and middleware
    - Create `server/src/index.ts` with Express app setup
    - Configure CORS, JSON body parsing, error handling middleware
    - Set up route registration
    - _Requirements: All (API foundation)_

  - [ ] 6.2 Implement event search endpoint (POST /api/events/search)
    - Create `server/src/routes/events.ts`
    - Accept `SearchEventsRequest` body (lat, lng, radiusKm, filters, page, pageSize)
    - Validate radius, check cache, trigger scraping if needed
    - Apply filters, pagination, distance calculation
    - Return `SearchEventsResponse`
    - _Requirements: 2.3, 3.1, 5.1, 5.4_

  - [ ] 6.3 Implement event detail endpoint (GET /api/events/:id)
    - Return full event details including description and source URL
    - _Requirements: 5.3_

  - [ ] 6.4 Implement recommendations endpoint (POST /api/recommendations)
    - Accept `RecommendationRequest` body
    - Validate preferences length (≤ 200 chars)
    - Call RecommendationService, return `RecommendationResponse`
    - Handle timeout with appropriate error message
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [ ] 6.5 Implement chat endpoint (POST /api/chat)
    - Accept `ChatRequest` body
    - Validate message (1-500 chars trimmed)
    - Trim conversation history to last 20 messages
    - Call LLMService.chat, return `ChatResponse`
    - Handle timeout with error message
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ] 6.6 Implement sources CRUD endpoints
    - `GET /api/sources` — list all sources with last update timestamp
    - `POST /api/sources` — add new source (validate URL, check limit, validate content)
    - `DELETE /api/sources/:id` — remove custom source
    - `POST /api/sources/:id/validate` — validate source reachability and content
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6_

  - [ ] 6.7 Implement geocode endpoint (POST /api/geocode)
    - Accept address string, call GeocodingService
    - Return coordinates or error message
    - _Requirements: 1.5, 1.6_

- [ ] 7. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement frontend - Geolocation and layout
  - [ ] 8.1 Set up TailwindCSS and base layout
    - Configure TailwindCSS in the Vite project
    - Create `App.tsx` root component with responsive layout
    - Set up React Router (if needed) or single-page layout with panels
    - _Requirements: All (UI foundation)_

  - [ ] 8.2 Implement GeolocationProvider context
    - Create `client/src/contexts/GeolocationContext.tsx`
    - Request browser geolocation permission on app load
    - Handle permission granted: store coordinates
    - Handle permission denied: show manual address input
    - Handle timeout (>10s): show error message + manual input fallback
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 8.3 Implement manual address input with geocoding
    - Create address input component with submit button
    - Call `POST /api/geocode` on submit
    - Handle success: update position in context
    - Handle error: show "indirizzo non trovato" message, allow retry
    - _Requirements: 1.3, 1.5, 1.6_

  - [ ] 8.4 Implement RadiusControl component
    - Create slider/input component for radius 1-100 km (integer increments)
    - Set default value to 15 km
    - Prevent values outside 1-100 range
    - Trigger event refresh on change
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 9. Implement frontend - Map and event list
  - [ ] 9.1 Implement MapView component with Leaflet
    - Create `client/src/components/MapView.tsx`
    - Initialize Leaflet map centered on user position
    - Show user position with distinct blue marker
    - Show semi-transparent circle for search radius
    - Enable zoom and pan interactions
    - _Requirements: 4.1, 4.4, 4.6_

  - [ ] 9.2 Implement venue markers and category colors
    - Create `client/src/utils/categoryColors.ts` with `getCategoryColor(category)` function
    - Map each EventCategory to a unique color
    - Render venue markers with category-specific colors
    - Show popup on marker click: venue name, address, event list with dates
    - _Requirements: 4.2, 4.3_

  - [ ]* 9.3 Write property test for category color uniqueness (Property 6)
    - **Property 6: Unicità mappatura categoria-colore**
    - Test that distinct categories always map to distinct colors
    - Use generators: pairs of distinct categories from EventCategory enum
    - **Validates: Requirements 4.2**

  - [ ] 9.4 Implement radius circle update
    - Update circle radius and visible markers when radius changes
    - Ensure update completes within 2 seconds
    - _Requirements: 4.5_

  - [ ] 9.5 Implement EventList component
    - Create `client/src/components/EventList.tsx`
    - Display events sorted by date: name, date/time, venue, distance, category
    - Implement pagination (20 per page, load more button)
    - _Requirements: 5.1, 5.2_

  - [ ] 9.6 Implement EventDetail component
    - Create `client/src/components/EventDetail.tsx`
    - Show full event details: name, date/time, venue, address, category, description
    - Show clickable link to source URL
    - Handle unreachable source: show "fonte non disponibile" message
    - _Requirements: 5.3, 5.6_

  - [ ] 9.7 Implement event filters UI
    - Create filter controls: category multi-select, date range picker, distance slider
    - Apply filters in combination, update list within 2 seconds
    - Show "nessun evento trovato" message when no results, suggest expanding radius
    - _Requirements: 5.4, 5.5, 2.5_

- [ ] 10. Implement frontend - Recommendations and chat
  - [ ] 10.1 Implement RecommendationPanel component
    - Create `client/src/components/RecommendationPanel.tsx`
    - Show "Cosa faccio stasera?" button
    - Display up to 3 recommendations with event info and reason
    - Show preferences text input (max 200 chars)
    - Handle loading state and timeout errors
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 10.2 Implement ChatInterface component
    - Create `client/src/components/ChatInterface.tsx`
    - Show message input field, send button, message history area
    - Validate message: disable send for empty/whitespace-only input
    - Enforce 500 character limit
    - Show loading indicator while LLM processes
    - Maintain conversation history in component state (max 20 messages, session-scoped)
    - Handle timeout: show error message with retry suggestion
    - LLM responds in Italian
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 11. Implement frontend - Source management
  - [ ] 11.1 Implement SourceManager component
    - Create `client/src/components/SourceManager.tsx`
    - List all sources with name, URL, last update timestamp, status
    - Show "Aggiungi fonte" form with URL input (max 2048 chars)
    - Validate and add source via API (show loading during validation)
    - Show error messages for validation failures (URL unreachable, no events found)
    - Allow removal of custom sources (not default ones)
    - Show default sources as non-removable
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 12. Integration and wiring
  - [ ] 12.1 Wire frontend to backend API
    - Create `client/src/api/client.ts` with typed API client functions
    - Connect GeolocationProvider → event search on position determined
    - Connect RadiusControl → event search on radius change
    - Connect EventList filters → event search with filters
    - Connect RecommendationPanel → recommendations endpoint
    - Connect ChatInterface → chat endpoint
    - Connect SourceManager → sources endpoints
    - _Requirements: All (integration)_

  - [ ] 12.2 Implement end-to-end data flow
    - On app load: get position → search events → display on map + list
    - On radius change: re-search → update map circle + markers + list
    - On filter change: re-filter → update list
    - Handle "no events found" state with suggestion to expand radius
    - _Requirements: 2.3, 2.5, 3.1, 4.5_

  - [ ]* 12.3 Write integration tests for scraping pipeline
    - Test full flow: fetch page → LLM extraction → deduplication → storage
    - Use mock web sources and mock LLM responses
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

  - [ ]* 12.4 Write integration tests for chat and recommendations
    - Test chat endpoint with mock OpenAI responses
    - Test recommendations endpoint with mock events
    - Verify Italian language responses
    - _Requirements: 6.2, 6.4, 7.2_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design specifies TypeScript for both frontend and backend
- All LLM responses must be in Italian as per Requirements 6.4 and 7.2
- The app uses a 1-hour cache TTL for scraped events to avoid excessive API calls
- Default sources (Eventbrite, Facebook Events, pagine comuni) are seeded on DB initialization

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.3", "2.5", "2.7", "2.9", "2.11"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.6", "2.8", "2.10", "2.12"] },
    { "id": 4, "tasks": ["4.1", "4.3", "4.5", "4.7"] },
    { "id": 5, "tasks": ["4.2", "4.4", "4.6", "4.8"] },
    { "id": 6, "tasks": ["5.1", "5.2", "5.7", "5.8"] },
    { "id": 7, "tasks": ["5.3", "5.5"] },
    { "id": 8, "tasks": ["5.4", "5.6"] },
    { "id": 9, "tasks": ["6.1"] },
    { "id": 10, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "6.7"] },
    { "id": 11, "tasks": ["8.1"] },
    { "id": 12, "tasks": ["8.2", "8.3", "8.4"] },
    { "id": 13, "tasks": ["9.1", "9.2", "9.5"] },
    { "id": 14, "tasks": ["9.3", "9.4", "9.6", "9.7"] },
    { "id": 15, "tasks": ["10.1", "10.2", "11.1"] },
    { "id": 16, "tasks": ["12.1"] },
    { "id": 17, "tasks": ["12.2"] },
    { "id": 18, "tasks": ["12.3", "12.4"] }
  ]
}
```
