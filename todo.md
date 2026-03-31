# Aloha Travel Agent — Project TODO

## Database & Backend
- [x] Database schema: trips, chat_messages, itinerary_items, search_results tables
- [x] tRPC router: trip CRUD (create, list, get, update)
- [x] tRPC router: chat messages (send, list, stream AI response)
- [x] tRPC router: itinerary items (add, remove, reorder)
- [x] tRPC router: web search integration (activities, lodging, restaurants)
- [x] AI agent system prompt with multi-step planning workflow
- [x] Persistent trip state (planning stage, collected data)

## UI / App Shell
- [x] Global theme: elegant tropical palette, large readable fonts
- [x] App layout with sidebar navigation and main content area
- [x] Mascot/avatar system (hula dancer for Hawaii, configurable per destination)
- [x] Mascot animation and personality display
- [x] Responsive design (desktop + tablet)

## Chat Interface
- [x] Conversational chat UI with message bubbles
- [x] Streaming AI response rendering (Streamdown)
- [x] Multi-step planning workflow (dates → islands → budget → activities → lodging → transport)
- [x] Quick-reply suggestion buttons
- [x] Chat history persistence per trip

## Trip Dashboard
- [x] Current planning stage indicator
- [x] Selected islands display (Oahu, Big Island)
- [x] Budget summary card
- [x] Travel dates display
- [x] Planning progress tracker

## Itinerary Organizer
- [x] Save activities, lodging, restaurants to itinerary
- [x] Organize by island and day
- [x] Remove/reorder items
- [x] Itinerary summary view

## Search & Discovery
- [x] AI-powered activity search per island
- [x] Lodging search (hotels, Airbnb, unique stays)
- [x] Restaurant & dining search
- [x] Search results cards with save-to-itinerary action

## Trip Templates
- [x] Hawaii trip template pre-configured
- [x] New trip creation from template
- [x] Multi-guest support (trip members)

## Accessibility / Elderly-Friendly
- [x] Large text (18px+ base font)
- [x] High contrast colors
- [x] Clear, simple navigation labels
- [x] Large tap targets (buttons 48px+)
- [x] Minimal cognitive load layout
- [x] Helpful tooltips and guidance text
