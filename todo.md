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

## Family Members & Permissions
- [x] Database: trip_members table (name, email, role, planning path, avatar color)
- [x] Roles: owner (full control), planner (can add/edit), viewer (read-only — grandkids)
- [x] Family member onboarding form on trip creation / trip settings
- [x] Planning path selection per member: activities-first OR lodging-first
- [x] Member profile cards showing name, role, path, and contribution count
- [x] Permission enforcement: viewers cannot add/edit/delete itinerary items
- [x] Trip owner can change member roles at any time

## Individual Planning Paths
- [x] Activities-first path: dates → islands → budget → activities → restaurants → lodging → transport
- [x] Lodging-first path: dates → islands → budget → lodging → transport → activities → restaurants
- [x] Each member gets their own AI chat session with their chosen path
- [x] Each member's saved items are tagged with their name
- [x] Visual indicator on itinerary items showing which member saved them

## Collaborative Merge & Finalization
- [x] Merge view: side-by-side comparison of each member's saved items
- [x] Voting/approval system: members can upvote items to surface the best picks
- [x] Finalize button: owner merges selected items into the master itinerary
- [x] Conflict resolution: flag duplicate lodging/activity picks
- [x] Final itinerary view: combined, organized, ready to export

## PDF Export
- [x] Export full itinerary to PDF (day-by-day, organized by island)
- [x] Include trip details: dates, islands, budget, travelers
- [x] Include each item: title, description, location, price, URL
- [x] Branded with mascot and trip title
- [x] Download button on itinerary tab

## Invite System
- [x] Generate shareable invite link per trip (with role pre-set)
- [x] Invite link encodes trip ID + role + expiry token
- [x] Invite acceptance page: enter name, choose planning path, join trip
- [x] Email invite option (copy-to-clipboard link)
- [x] Pending invites list in trip settings
- [x] Revoke invite links

## Mascot Rename
- [x] Rename Hawaii mascot from "Lei" to "Leilani" throughout all components and agent prompts

## Budget Tracker
- [x] Add estimatedCost (decimal) and costNotes fields to itinerary_items table
- [x] tRPC procedure: budget.summary — totals costs by category and island vs trip budget
- [x] BudgetTracker component: overall progress bar (spent vs budget)
- [x] Category breakdown: activities, lodging, dining, transport with individual subtotals
- [x] Per-item cost editing inline on itinerary items
- [x] Color-coded status: green (under budget), amber (75%+), red (over budget)
- [x] Budget tracker visible in TripDashboard sidebar (always visible)
- [x] Budget tracker also shown in Merge & Finalize tab
- [x] "Uncosted items" count badge for items missing an estimate

## Flight Tracker
- [x] flights table: id, tripId, userId, flightNumber, airline, departureAirport, arrivalAirport, departureTime, arrivalTime, date, leg (outbound/return/inter-island), confirmationCode, notes, sortOrder
- [x] tRPC flights router: add, list, update, delete
- [x] FlightTracker component: add flight form with airline, flight number, airports, times
- [x] Flight timeline display sorted by date/time
- [x] Inter-island flight support (Oahu → Big Island leg)
- [x] Flights tab in TripDashboard
- [x] Flight cards with confirmation code display
- [x] Flights included in PDF export

## Interactive Island Map
- [x] MapView component using built-in Google Maps integration
- [x] Plot all master itinerary items as map markers (activities, lodging, restaurants, transport)
- [x] Color-coded markers by category (green=activity, blue=lodging, orange=dining, purple=transport)
- [x] Island selector to switch between Oahu and Big Island views
- [x] Click marker to see item title, description, and link
- [x] Map tab in TripDashboard
- [x] Auto-fit map bounds to show all markers for selected island
- [x] Geocode item locations using Google Maps Places API

## Day-by-Day Itinerary Builder
- [x] Add scheduledDay (int, 1-based day number) and scheduledTime (varchar, HH:MM) to itinerary_items table
- [x] Add dayLabel (varchar) to itinerary_items for custom day names (e.g. "Arrival Day", "North Shore Day")
- [x] tRPC procedure: itinerary.schedule — assign item to a day and time
- [x] tRPC procedure: itinerary.unschedule — remove item from a day slot
- [x] tRPC procedure: itinerary.reorderDay — reorder items within a day
- [x] ItineraryBuilder component: day-column layout showing each trip day
- [x] Unscheduled items pool at top/side — drag or click to assign to a day
- [x] Each day column shows date, island label, and scheduled items in time order
- [x] Time slot selector per item (Morning / Afternoon / Evening / custom time)
- [x] Item cards show category emoji, title, location, and estimated cost
- [x] "Unassign" button to move item back to the unscheduled pool
- [x] Day summary: total estimated cost per day
- [x] Island grouping: days automatically labeled with the island (Oahu days vs Big Island days)
- [x] Print-ready view: clean day-by-day schedule included in PDF export
- [x] Schedule tab in TripDashboard

## How This Works — Help Page
- [x] HowItWorks page at /help — full quick-reference guide, easy to read, large text
- [x] First-run detection using localStorage — auto-opens on first visit ever
- [x] "How This Works" button on every page header — opens /help in a new window
- [x] Content sections: Welcome, Chat with Leilani, Trip Planning Steps, Family Members & Roles, Budget Tracker, Flights, Map, Day Schedule, Tips for Elderly Users
- [x] Content stays current — structured so it can be updated as features are added
- [x] Clean print-friendly layout (can be printed as a reference sheet)

## Admin Change Request Window
- [x] Admin-only "Suggest a Change" button visible only to owner/admin role users
- [x] Opens /admin/feedback in a new browser window (never interrupts current session)
- [x] Change request form: title, description, priority (low/medium/high), category (bug/feature/improvement)
- [x] Submitted requests stored in DB (change_requests table)
- [x] Request history list: shows all past requests with status (pending/in-progress/done)
- [x] Admin can mark requests as done or add notes
- [x] Only users with role=admin or trip owner can access this page
