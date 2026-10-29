# Footnote: Product Plan

October 29, 2026. Product name: Footnote (行迹, Xingji).

Footnote is a travel workspace for a group of friends. With AI drafting
every step, the group plans together, keeps every ticket in one place,
checks in on site, jots down ideas as they come and shares costs. When
the trip ends, the plan turns into a photo album.

## 1. Product positioning

Footnote is a shared workspace for group trips plus a memory album that
builds itself after the trip. It is not another place-discovery or
review platform.

**What the name means.** The Chinese name 行迹 (Xingji) means the traces
you left as you walked, and also the line that joins up on your year-end
footprint map. Footnote combines "foot" and "note": the path you walked
and every sentence you jotted down on the way. A footnote is also a
small note added at the bottom of a page, like the small notes you add
to a trip story. Before the trip it is the itinerary book, during the
trip it is the ticket wallet, and afterwards it becomes a photo album
and a footprint map.

**One-line positioning.** A group of friends keeps the plan, the tickets
and the photos in one place, and when the plan is finished, the album is
finished too.

**Four problems it solves:**

1.  Recommendations from Xiaohongshu and Instagram are scattered across
    > apps and chat history, and are forgotten by the time you reach the
    > place.

2.  Tickets and QR codes are buried in email and the photo roll, so you
    > dig for them on site.

3.  The entry time on a ticket does not match the plan, and you have to
    > rearrange everything after it by hand.

4.  You take many photos on a trip, nobody organizes them afterwards,
    > and they sit unused on the phone.

**What it does not do.** It does not compete with Google Maps on how
complete or accurate its place data is. Discovery still happens on
Xiaohongshu, Instagram and Google Maps. Footnote collects what your
group chose, orders it and ties it together.

## 2. Target users and core scenario

The first users are friend groups of 3 to 8 people taking a 3 to 10 day
trip abroad or to another city, with at least one person willing to act
as the organizer.

**How one full trip goes:**

1.  **4 to 6 weeks before: create the trip.** The organizer enters the
    > destination, dates, group size, arrival time, hotel location and
    > pace. The system generates a day-by-day skeleton and an invite
    > link.

2.  **2 to 4 weeks before: collect and vote.** Friends join through the
    > link and drop in links from Xiaohongshu, Instagram, Reels and
    > Google Maps. Everyone likes places, and the most liked ones are
    > dragged into the itinerary.

3.  **1 to 2 weeks before: book and upload.** Each ticket is uploaded as
    > it is bought. The system reads the time and aligns the itinerary,
    > and flags conflicts.

4.  **During the trip: read the plan, open tickets, check in.** Each
    > day, the group opens the day view to see the next stop, nearby
    > suggestions and the matching ticket, and takes photos on arrival.
    > Photos stay collapsed by default.

5.  **After the trip: the album.** When every itinerary item is checked
    > in, an album is generated that can be shared as a link or exported
    > as a PDF.

| Role             | Who                                               | Main permissions                                                        |
|------------------|---------------------------------------------------|-------------------------------------------------------------------------|
| Organizer        | The person who creates the trip                   | Edit the skeleton, manage members, lock the itinerary, export the album |
| Member           | Invited friends                                   | Add places, vote, upload tickets, take photos, edit their own notes     |
| Viewer (phase 2) | Family who do not travel but want to follow along | Read-only access to the itinerary and album                             |

## 3. Design principles

Use these five rules to make trade-offs. When they conflict, the earlier
one wins.

1.  **A ticket is a fact, a plan is an intention.** An item with a
    > ticket has a fixed time, and the plan adjusts around it, never the
    > other way round.

2.  **Automatic changes must be visible and reversible.** Tell the user
    > what the system changed and why, and let them undo it in one tap.

3.  **Every recommendation has a source.** Each place shows who
    > recommended it and where it was seen, with one tap to the original
    > post.

4.  **On-site use comes first.** Signal is poor at the gate and hands
    > are busy, so tickets open offline and common actions take no more
    > than two taps.

5.  **Private first, public later.** Version one serves a single private
    > trip group. It has no public social features and no feature that
    > needs email access.

### 3.1 AI first: AI drafts every step, people confirm

Footnote works on the principle "AI drafts, people edit". Users never
start from a blank page. At each step they see an AI-generated draft
first, then approve it or adjust it.

| Step                 | What AI generates                                                                                       | What the user does                          | Safeguard                                                                        |
|----------------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------|----------------------------------------------------------------------------------|
| Create trip          | A day-by-day skeleton from the inputs, with time blocks, travel buffers and clustering around the hotel | Drag, edit, delete                          | The result is a draft and can be regenerated as a whole                          |
| Collect places       | A place card from a link: name, category, a summary of why it is recommended, matched to a map location | Confirm the place is correct                | When the match is uncertain, it lists candidates and does not decide             |
| Plan days            | Places with the most votes placed into a suitable day and time block, with reasons                      | Accept or pick another option               | Two or three options each time                                                   |
| Nearby suggestions   | Opening a place shows nearby places from the group pool, each with one line on why it is worth a detour | Add to the itinerary in one tap             | Only places already in the group pool                                            |
| Tickets              | Reads attraction, date, time and headcount, and matches the ticket to an itinerary item                 | Confirm the result                          | Shown as "pending" until confirmed                                               |
| Itinerary changes    | Proposes an adjustment from the ticket time, explains each change and offers options for conflicts      | Approve, choose another option or undo      | The proposal takes effect only after fixed rules validate it (see section 5)     |
| Quick notes          | Sorts a single sentence into the right place (see 4.8)                                                  | Check the confirmation card, undo if needed | High-risk items are previewed first                                              |
| Daily brief          | Each morning: departure time, tickets to bring, weather, nearby suggestions                             | Read                                        | Uses only data already in the trip, never invented                               |
| Album and share page | Album layout, one line of text per place, style recommendations, and a shareable trip page              | Choose the style, reorder photos, edit text | Never rewrites the user's own words and never uses photos that were not uploaded |

**Three firm limits:**

1.  AI only proposes. Before anything takes effect, a person or a fixed
    > rule must approve it, especially for time and ticket changes.

2.  Everything AI generates carries an "AI generated" label. The label
    > disappears once a user edits the content.

3.  Every step can be done by hand without AI, so the product still
    > works when AI makes a mistake or there is no network.

## 4. Feature details

### 4.1 Itinerary skeleton

**User story.** As the organizer, I fill in a few parameters and
immediately see an editable skeleton instead of a blank page.

| Input                      | Example                                              | Used for                                  |
|----------------------------|------------------------------------------------------|-------------------------------------------|
| Destination                | Paris                                                | Map center and city data                  |
| Dates                      | April 12 to April 17                                 | Number of days                            |
| Arrival and departure time | Arrive 14:30 on day one, leave 11:00 on the last day | First and last days get a half day only   |
| Group size                 | 5                                                    | Ticket counts and restaurant reservations |
| Hotel location             | The Marais                                           | Geographic center of each day             |
| Pace                       | Relaxed, moderate or packed                          | 2, 3 or 4 main items per day              |
| Must-see list (optional)   | Louvre, Eiffel Tower                                 | Scheduled first                           |

**Generation rules:**

- Each day has morning, afternoon and evening blocks, with buffers for
  > travel and meals.

- Items on the same day are clustered by distance, to avoid crossing the
  > city back and forth.

- Popular sights that need advance tickets go on earlier days, which
  > leaves time to buy tickets.

- The result is only a draft. Every item can be dragged, deleted or
  > re-timed.

**Edge case.** If the group arrives very late (for example after 22:00),
nothing is scheduled that day except a "check in" marker.

### 4.2 Place pool and source links

**User story.** As a member, when I come across a place I want to visit,
I drop it into the group pool in one step, and friends can see it and
jump to the original post.

**Ways to add a place:**

1.  **Paste a link** from Xiaohongshu, Instagram, TikTok, YouTube,
    > Google Maps or any web page. The system saves the link, page title
    > and thumbnail (taken from the page's public sharing metadata), and
    > asks you to add the place name.

2.  **Search a place** on the map and add it.

3.  **Share to Footnote.** On Android use the system share menu. On
    > iPhone, copy the link and paste it.

**A place card contains:** name, map location, category (sight,
restaurant, cafe, shopping, other), who recommended it, source links
(one or more), the reason for the recommendation, your own screenshots
or notes, like count, and status (want to go, scheduled, visited,
dropped).

**Rules:**

- One place can have several sources. If two people recommend the same
  > shop from different posts, the posts merge into one card and keep
  > both links.

- If a link has no place information, the person who added it fills in
  > the place by hand. The system does not guess.

- Each person gets one like per place and can take it back.

**About Xiaohongshu links.** Footnote saves only links that users share
themselves, together with their own notes. It does not scrape post text
or images. Tapping a link opens the original post in the Xiaohongshu app
or website.

### 4.3 Nearby suggestions

**User story.** As a member, when I open the Louvre, I immediately see
other places from the group pool within 500 meters, such as the small
shop that sells French toast.

**Rules:**

- The default radius is 500 meters and can be changed to 300 meters or 1
  > kilometer.

- Only places in this group's pool are shown, sorted by distance and
  > likes.

- Each entry shows the name, distance, walking minutes, who recommended
  > it and a source icon that jumps straight to the original post.

- One tap on "Add to today" inserts it into a suitable time slot and
  > checks for conflicts.

- In the itinerary timeline, when there is a gap between two items, the
  > app tells you how many places are nearby for that gap.

### 4.4 Ticket center

**User story.** As a member, I keep all tickets in one place, so I do
not dig through email on site and do not miss any.

**Upload (version one).** Choose a file (PDF or image), take a photo, or
pick several from the photo library. Several tickets can be dropped in
at once.

| Field read by the system    | Example                                        |
|-----------------------------|------------------------------------------------|
| Attraction or activity name | Louvre Museum                                  |
| Date                        | April 13                                       |
| Entry time or time window   | 10:00, or 10:00 to 10:30                       |
| Headcount or ticket type    | Adult x 5                                      |
| QR or bar code              | The original image is kept and can be enlarged |
| Order number                | Used for checking                              |

**Rules:**

- Results show as "pending" until the user confirms or edits them with
  > one tap. This prevents a recognition error from changing the
  > itinerary silently.

- The system matches each ticket to an itinerary item by name and date,
  > and asks the user to choose when there is no match.

- One itinerary item can have several tickets, and one ticket can cover
  > several people. Tickets for the same attraction are grouped.

- When a ticket opens, screen brightness goes to maximum and the screen
  > stays on.

- All tickets are cached on the device and open without a network.

**Edge case.** If a ticket is in a foreign language with an unusual
layout, or the date is ambiguous (for example 04/05 could be April 5 or
May 4), the user always confirms.

### 4.5 Ticket-driven itinerary changes

**Core rule: an item with a ticket is a fixed anchor, and everything
else is rearranged around it.** Section 5 has the decision flow. This is
what the user sees:

- The plan has the Louvre at 9:00 and the uploaded ticket says 10:00.
  > The Louvre moves to 10:00 and is marked "Originally 9:00, adjusted
  > to match the ticket".

- Items before and after are pushed back or compressed as needed,
  > keeping their order and their own durations.

- If the change collides with another fixed item, the system does not
  > resolve it silently. It shows a conflict prompt with three choices:
  > change the time, move to another day, or keep the conflict.

- Every automatic adjustment is recorded in the change log, and each can
  > be undone in one tap.

### 4.6 On-site check-in and photos

**User story.** As a member, when I arrive somewhere I tap the camera
icon, take a photo or pick one, and upload it without interrupting my
view of the plan.

**Rules:**

- Every itinerary item has a camera icon. It opens the camera or the
  > photo library, and several photos can be uploaded at once.

- Photos record time, itinerary item and uploader automatically, and can
  > carry a short note.

- Photos are collapsed by default. The itinerary view only shows a small
  > badge with the count.

- Check-in is an explicit action: tapping "I'm here" marks the item as
  > done, whether or not there is a photo.

- Photos are compressed before upload. On a weak connection they wait in
  > a queue and upload when the network returns. The original is kept by
  > default.

- Several members can upload to the same item, and the album merges them
  > by capture time.

### 4.7 Automatic album

**User story.** As a member, after the trip I receive an album that is
already laid out, and even the tiny French toast shop has the photos
from that moment.

**Trigger.** Every itinerary item is checked in, or the organizer taps
"Generate album".

**Structure:**

- Cover: trip name, dates and travel companions.

- One chapter per day: the date, a route overview and one page per
  > place.

- Each place page: place name, time, photos, everyone's notes, and
  > optionally the saved source link.

- Last page: trip statistics such as cities visited, places visited and
  > photo count.

**Output.** A web link for sharing, or a PDF. A place with no photos
shows a clean name page, with no blank space.

**Editable.** Members can hide a photo. The organizer can reorder pages
and choose the cover.

### 4.8 AI quick notes

**User story.** As a member, when something suddenly occurs to me
("bring the passport to the Louvre tomorrow", "that toast shop is closed
on Tuesdays"), I say or type one sentence and the AI files it in the
right place, so I do not look for a page, pick a date or fill in a form.

**Entry point.** A "Note this" button sits at the bottom right of every
page and accepts typing or voice, with Chinese and English mixed freely.
When opened from an itinerary item or place page, the AI treats the note
as related to that item by default.

| What you say                                                                | How AI classifies it | Where it goes                                                            |
|-----------------------------------------------------------------------------|----------------------|--------------------------------------------------------------------------|
| "The Louvre queue was long, go earlier next time"                           | Note                 | Attached to the Louvre place card                                        |
| "Book a restaurant for Friday night"                                        | To-do                | Group to-do list, can be assigned to someone                             |
| "A friend says there's a great croissant shop called Du Pain in the Marais" | New place            | Place pool; AI searches the map for a match and waits for you to confirm |
| "Remind me at 8 tomorrow to pick up tickets"                                | Reminder             | A push notification at that time, only for you                           |
| "Move Wednesday to Versailles in the afternoon"                             | Itinerary change     | Creates a proposed change that takes effect only after you confirm       |
| "The taxi just cost 25 euros"                                               | Expense              | Expense log (phase 2, see 4.12)                                          |

**You can also ask questions:** "Which tickets are still unconfirmed?",
"What have we saved near Thursday's dinner?", "What time do we leave the
day after tomorrow?" The AI answers only from data already in this trip,
and says so when it cannot find something, without making anything up.

**Rules:**

1.  **A confirmation card appears right after each note,** for example
    > "Saved to: Louvre, note", with an Undo button. It folds away after
    > three seconds if untouched.

2.  **Low-risk content is saved directly, high-risk content needs
    > confirmation.** Notes, to-dos and reminders are saved directly.
    > New places, itinerary changes and anything that affects other
    > people show a preview first and need your tap.

3.  **AI never edits a fixed itinerary item directly.** For items with
    > tickets it can only make suggestions.

4.  **Visibility is always clear.** Personal notes and reminders are
    > visible only to you by default. Places and to-dos are visible to
    > the whole group by default. A small icon on the card shows which,
    > and one tap changes it.

5.  **If unsure, it asks one question.** For example, when "Wednesday"
    > matches two items, it asks only "The morning Versailles item or
    > the afternoon one?" and does not keep asking.

6.  **It works offline.** Without a network, your original words are
    > stored on the phone and handed to the AI when you are back online.
    > The original words are always kept, so you can check how the AI
    > understood them.

**Links with other modules.** New places the AI records feed straight
into nearby suggestions. When a recognized ticket disagrees with the
plan, the AI writes a plain sentence about it (for example "The ticket
says 10:00, so the Louvre moved from 9:00 to 10:00"). When the album is
generated, the AI can turn a day's notes into one line per place page,
without rewriting your own words.

**What it does not do.** It does not volunteer a large "I planned the
whole trip for you" proposal, does not interrupt when you have not
asked, and does not send your private notes to other members.

### 4.9 Memory space: your own scene and your albums

**User profile.** People who love traveling with friends and also love
looking back afterwards. They want more than an itinerary: they want a
place to come back to again and again.

**User story.** As a user, I open my "memory space" in the app and see a
cozy scene that I chose myself (for example a study, a cafe, an attic or
a seaside cabin). I tap the bookshelf or album rack in the scene, where
all my trip albums stand, and open any one to browse that trip.

**The scene is the user's choice:**

- Footnote offers several warm, quiet scene illustrations with light
  > animation (for example the desk lamp and window light of a study,
  > the steam in a cafe, the waves at a seaside cabin). Each user picks
  > one as their own space and can change it at any time. It does not
  > have to be a study.

- On the album rack in the scene, each book is one trip. The spine color
  > and title come from that album's style, and a finished album appears
  > on the rack.

- Small objects in the scene can change with your trips, for example a
  > small souvenir appears after a Paris trip. Version one does not
  > include this, so it stays as a later surprise.

**What is inside each album:**

- Pages turn day by day, with one page per place and the exact day and
  > time, for example "April 13, 10:00, Louvre".

- The photos from that moment, everyone's notes, and the source link
  > from when the place was saved.

- A ticket can also be a page and keeps the look of the entry ticket
  > (visible only to you and your travel companions).

**The album style is the user's decision:**

- Users decide the style of each album themselves. They choose from a
  > set of designed themes (layout, fonts, background texture, spine
  > color) and can adjust the colors.

- AI only recommends. It analyzes the overall color, brightness and mood
  > of the trip's photos (for example warm yellow film or cool
  > grey-blue) and suggests two or three matching themes. The user
  > decides which to use.

- AI does not design layouts freely, so every album looks good and no
  > layout breaks. Users can switch themes at any time.

### 4.10 Year-end footprint map

**User story.** As a user, at the end of the year I can see every place
I went that year, drawn as one footprint map.

**Content:**

- A map joins every checked-in place from all trips of the year into
  > routes. Each point opens the matching album page.

- Simple yearly statistics: number of trips, cities, places and photos,
  > and the friend you traveled with most.

- It can be saved as an image to share, and can also sit in the memory
  > space as a "year book" on the rack.

**Data source.** Only checked-in itinerary items and places are used.
Footnote does not record the phone's location in the background, which
protects privacy and saves battery.

**Timing.** A reminder to generate it comes each December, and the year
so far can be viewed at any time. Over the long term the maps accumulate
into "every year you traveled".

### 4.11 Trip soundtrack

**User story.** As a user, when I open an album, the music chosen during
that trip starts to play.

**How a song is chosen:**

- During or after the trip, each person can add a song or playlist to
  > the whole trip or to one day, by pasting a share link.

- The album records who picked it and on which day. The matching song
  > plays when that page is open, or the whole album plays as a
  > playlist.

- AI can suggest a few alternatives from the day's places and photo
  > mood, and a person always makes the final choice.

**All music sources are supported.** Any service that gives a share link
works, including Spotify, Apple Music, YouTube Music, NetEase Cloud
Music, QQ Music and Bilibili. Platforms that allow embedding play inside
the page. For the others, a tap opens the song in that platform's app.

**Technical and copyright limits:**

- Footnote does not store or stream music files. It keeps only the link
  > and song title.

- Full playback usually requires the user to be signed in to that
  > platform, and some platforms allow only a preview clip. Those are
  > the platforms' rules, not something the product decides.

- Version one only saves the link and song title and jumps to the
  > platform when tapped. Embedded playback comes later.

### 4.12 Expense log and splitting

**User story.** As a member, during the trip I record who paid and how
much with one sentence or one photo of a receipt, and after the trip the
app tells everyone who should send how much to whom.

**Ways to record:**

- Fill in an entry by hand: amount, currency, who paid, who shared it,
  > category and date, optionally linked to an itinerary item.

- Say one sentence as a quick note (see 4.8), for example "The taxi just
  > cost 25 euros, split between the four of us". The AI picks out the
  > amount, currency and people, and shows a confirmation card.

- Upload a photo of a receipt. The AI reads the amount and date, and the
  > user confirms.

**Rules:**

- By default the cost is split equally among everyone who shared it, and
  > can also be set by person or by ratio.

- Each entry keeps its original currency. At settlement, everything is
  > converted into one currency chosen by the group. The rate is the one
  > for the day of the entry, and users can change it by hand.

- After the trip the app produces a list of "who sends how much to
  > whom", with as few transfers as possible. Footnote only records and
  > calculates. It does not move money or handle payments.

- Amounts read by AI show as "pending" and count only after the user
  > confirms.

- Only travel companions can see the expenses. A personal expense can be
  > marked "not shared".

- The album and the year-end map can optionally show total spending. It
  > is hidden by default.

**Phase.** Phase 2 (see section 9).

## 5. Key flow: ticket-driven itinerary changes

Only tickets that the user has confirmed trigger a change, and an
adjustment takes effect only after it passes the conflict check. The
flow runs in this order:

1.  **Upload the ticket.** Take a photo or choose files, several at a
    > time.

2.  **AI reads the ticket:** attraction, date, time and headcount.

3.  **Does the user confirm the result?** If not, the user edits the
    > recognized result and confirms again.

4.  **Match to an itinerary item** by name and date. If there is no
    > match, the user chooses.

5.  **Is the time on the ticket the same as the planned time?** If yes,
    > the item is locked as a fixed item, marked "by ticket", and other
    > items arrange themselves around it. The flow ends.

6.  **If not, AI proposes an adjustment:** push back or compress the
    > items before and after, with the reason written out.

7.  **Does the proposal conflict with another fixed item?** If yes, a
    > conflict prompt offers three choices: change the time, move to
    > another day, or keep the conflict. After the user chooses, the
    > flow continues to the next step.

8.  **If there is no conflict, apply the adjustment and record it in the
    > change log.** Each entry can be undone in one tap.

Once an item with a ticket is locked, only the user can unlock it.

## 6. Pages and information architecture

The app is mobile first, with five tabs at the bottom, and each trip is
its own space.

| Page       | Main content                                                                        | Key actions                                                                  |
|------------|-------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| My trips   | Cards for all trips, with the current one pinned on top                             | Create a trip, join through an invite link                                   |
| Itinerary  | A timeline by day; each item shows time, place, a ticket badge and a photo badge    | Drag to reorder, change time, tap the camera, open a ticket, mark "I'm here" |
| Place pool | All candidate places, filterable by category, likes and status, in list or map view | Paste a link, search to add, like, drag into a day                           |
| Tickets    | All tickets by date, with status pending, matched or unmatched                      | Upload, confirm recognition, open a QR code full screen                      |
| Album      | During the trip it shows "checked in X of Y"; when complete it becomes the album    | Generate, edit, share, export                                                |

**Detail page for any itinerary item.** The top shows the place name and
a small map. The middle shows time and notes. Below that, in order, are
"Source links", "Nearby places", "Tickets" and "Photos", and each block
can be collapsed.

**Change log entry.** It sits at the top right of the itinerary page and
lists every automatic adjustment and member edit, which can be undone.

**Empty states.** The first time any page opens, it shows one sentence
of explanation and one main action button. For example, an empty place
pool says "Paste a Xiaohongshu link to try".

## 7. Data model

The core is a trip with the objects below attached. Every object records
its creator and time, so changes can be traced.

| Object         | Key fields                                                                                               | Notes                                                            |
|----------------|----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| Trip           | Name, destination, start and end dates, group size, hotel location, pace, invite code, time zone         | One group, one trip                                              |
| Member         | User, role (organizer or member), join time                                                              | Joins through an invite link                                     |
| Place          | Name, coordinates, category, status, list of likes, note                                                 | Belongs to the trip's place pool                                 |
| Source         | Platform, link, title, thumbnail, who added it, reason for recommendation                                | One place can have several sources                               |
| Itinerary item | Day, place, start time, duration, whether fixed, reason fixed, order                                     | One cell on the timeline                                         |
| Ticket         | File, recognized name, date, time and headcount, status (pending or confirmed), matched itinerary item   | One item can hold several tickets                                |
| Photo          | File, capture time, uploader, itinerary item, note, hidden or not                                        | A compressed version plus the original, which is kept by default |
| Change log     | Object, old value, new value, reason (ticket, manual or conflict resolution), who did it, whether undone | Supports undo                                                    |
| Expense        | Amount, currency, payer, participants, category, date, linked itinerary item, shared or not              | Phase 2; amounts read by AI start as pending                     |

**Key conventions:**

- An itinerary item marked "fixed" can only be changed by a ticket or
  > after the user unlocks it by hand.

- All times are stored in the destination's time zone and converted when
  > displayed, so trips across time zones do not go wrong.

- When an itinerary item is deleted, its tickets and photos are not
  > deleted. They become "unmatched" so the user can deal with them.

## 8. Technical approach

Version one is a web app that works in a mobile browser (a PWA), not a
native app. This lets one developer ship a version friends can test in 4
to 6 weeks.

| Layer                 | Choice                                                                                                                                                | Reason                                                                                                                             |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Front end             | React and Next.js, built as a PWA                                                                                                                     | The mobile browser can use the camera and photo library directly, the app can be added to the home screen and it can cache offline |
| Back end and database | Supabase (Postgres, login, realtime sync, file storage)                                                                                               | Covers multi-user collaboration, permissions and image storage in one service, so there is less to build                           |
| Login                 | Email magic link, or Apple or Google sign-in                                                                                                          | No password lowers the bar for friends to join. It is only for signing in and never reads email content                            |
| Maps                  | Mapbox or Google Maps Platform                                                                                                                        | Place search, map display, distance and walking time                                                                               |
| Ticket recognition    | A multimodal model reads the image and returns a fixed structure                                                                                      | More tolerant than classic OCR of ticket layouts from different countries, and the user still confirms the result                  |
| AI quick notes        | A large model with tool calls: it decides the type first, then calls fixed actions such as add note, add to-do, add place or propose itinerary change | The AI can only write through a whitelist of actions, which makes permissions and undo easy to control                             |
| Voice input           | The browser's built-in speech recognition, or a short audio upload for transcription when it is not supported                                         | The simplest option first, and users can fix the text by hand when recognition is off                                              |
| Album                 | An HTML template rendered and exported to PDF                                                                                                         | Start with one good-looking template and add more later                                                                            |
| Offline               | A service worker caches the itinerary, tickets and places; photos and quick notes go through a local queue                                            | It still works when signal is poor on site                                                                                         |

**Technical notes:**

- **Link information.** Only the page's public sharing metadata (title,
  > thumbnail) is read. The app does not sign in, scrape body text or
  > bypass any restriction. If nothing can be read, the user types the
  > place name.

- **Itinerary changes are "AI proposes, rules validate".** AI reads the
  > ticket, proposes the adjustment and explains the reason. Fixed rule
  > code checks that the proposal is valid (within opening hours, no
  > overlap with fixed items, travel time kept) and sends it back if
  > not. The rule code can be tested on its own, so a wrong AI answer
  > cannot damage the itinerary.

- **Permissions.** Row-level permissions in the database follow trip
  > membership, so non-members can read nothing. Ticket and photo files
  > use private links that expire.

- **Photos.** The client compresses a copy to a suitable size for
  > browsing. The original is kept by default for download and
  > high-resolution printing, and uploads retry automatically on a weak
  > connection. The original can be uploaded later if needed.

- **Cost control.** Ticket recognition and quick notes call the model
  > per use. Set a daily call limit for each trip and cache the result
  > for the same image.

### AI access options

**Decided.** Footnote will support users connecting their own AI, so
friends do not have to pay much for AI. It is built in three steps: in
phase 1 the developer provides AI with a daily limit; then an option to
enter your own API key is added; in phase 2 an MCP connector lets users
use Footnote from their own Claude or ChatGPT. An API key is billed by
usage by the AI company and needs a developer account. We expect usage
to be small, but it is not zero. Subscriptions such as ChatGPT Plus or
Claude Pro cannot be used directly. To keep costs down, simple jobs such
as sorting a quick note use a smaller model, only ticket recognition
uses a multimodal model, the same image is read once, and each trip has
a daily limit.

| Option                                                                                           | Who pays for AI         | Best for                                          | Phase         |
|--------------------------------------------------------------------------------------------------|-------------------------|---------------------------------------------------|---------------|
| The developer provides AI (daily call limit per trip)                                            | The developer           | Everyone, with no setup                           | Phase 1       |
| Users enter their own API key (OpenAI or Anthropic developer account)                            | The user                | A few friends willing to open a developer account | After phase 1 |
| Footnote runs as an MCP connector, so users talk to their own Claude or ChatGPT to record things | The user's subscription | Friends who already use Claude or ChatGPT         | Phase 2       |

**Not feasible.** Letting users sign in to Footnote with their ChatGPT
or Claude subscription and draw on its allowance. A subscription and an
API are separate, and third-party apps have no official way to use
subscription allowance.

**Limits of the MCP connector (per official documentation, checked
October 2026).** Claude's custom connectors work on plans from Free to
Enterprise and in the mobile app, and the server must be reachable from
the public internet. In ChatGPT, write actions are available only on
Business, Enterprise and Edu. Pro is read-only, it works on the web
only, and the feature is still in beta. Taking photos and uploading
tickets do not suit a chat window, so the connector complements the app
and does not replace it.

**Implementation requirement.** All AI calls go through one interface
layer, so switching models or using a user's own key needs no change to
business code. Users' API keys are stored encrypted and never appear in
logs.

## 9. Roadmap

Phase 1 serves a single private group. After each gate, decide whether
to move to the next phase. Phases are not drawn to a time scale. Only
the 4 to 6 weeks for phase 1 is my estimate, and the later phases depend
on the trial results.

| Phase                                             | Scope                                                                                                                                                                                                                                                        | Gate to the next phase                                                  |
|---------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| Phase 1: MVP (4 to 6 weeks)                       | AI itinerary skeleton; private group and place pool (links, likes); ticket upload with AI recognition and confirmation; ticket-driven itinerary changes; check-in photos and automatic album; AI quick notes (text)                                          | 3 to 5 groups complete one trip and meet the targets in section 11      |
| Phase 2: Enhancement (after the MVP is validated) | Voice quick notes; forward email to a dedicated address to collect tickets; stronger offline mode; daily brief; expense log and splitting; viewer role                                                                                                       | Intent to use again at 80% or more, and album completion at 60% or more |
| Phase 3: Opening up (once phase 2 is stable)      | Memory space, year-end footprint map and trip soundtrack; shareable trip page and album web page; map heat numbers (counting only data inside Footnote); public ratings and likes; trusted-source display for small, special places; iPhone native app shell | None defined yet                                                        |

**Suggested build order inside phase 1:**

1.  Login, create a trip, invite link, members.

2.  Itinerary timeline and AI skeleton.

3.  Place pool, link cards and nearby suggestions.

4.  Ticket upload, AI recognition and automatic itinerary changes.

5.  Check-in photos and automatic album.

6.  AI quick notes.

## 10. Risks and trade-offs

| Risk                                                                  | Impact                                                   | Response                                                                                                                                             |
|-----------------------------------------------------------------------|----------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| Xiaohongshu has no open API, and scraping breaks the platform's terms | Legal and account risk, and a shaky foundation           | Save only links shared by users, plus titles and the user's own notes, and send them back to the platform on tap. Do not scrape text or images       |
| Instagram and Reels cannot be searched by place in bulk               | "90 posts mention this place" on the map is not possible | Single posts can use official embeds. Heat numbers count only data inside Footnote (saves, links, reviews)                                           |
| Cold start: no public content                                         | No numbers on the map and weak discovery                 | Version one has no public social features. It serves private groups who come for their own trip                                                      |
| No email access                                                       | Tickets cannot be found automatically                    | Lower the effort with multi-select, drag-in and photo upload. Phase 2 adds "forward email to a dedicated address", which also needs no authorization |
| Limited share entry for PWAs on iPhone                                | Sharing from mail or photos to Footnote is clumsy        | Accept opening the app first and then choosing a file. Build a native shell once usage justifies it                                                  |
| Wrong ticket recognition                                              | The itinerary is changed incorrectly                     | Show results as "pending" first, change the itinerary only after confirmation, and make every change undoable                                        |
| AI misreads a quick note                                              | The note lands in the wrong place                        | Show a confirmation card right away with undo, preview high-risk items, and keep the original words                                                  |
| Privacy: photos and tickets contain personal information              | Risk of leaks                                            | Access control by trip membership, private file storage, and album sharing only when the organizer creates the link                                  |
| Poor network on site                                                  | A QR code will not open                                  | Tickets are cached locally and open offline                                                                                                          |

**Final trade-off on "why not just use Google Maps".** Version one does
not compete with Google Maps on place data. It competes on "a group
deciding together and keeping tickets and memories in one place". Public
discovery and social reviews come later, once private groups have built
up content, and the difference then is "trusted sources plus real
photos".

## 11. Success metrics

The goal of the MVP is not user numbers. It is to confirm that a group
of friends will use Footnote to complete a full trip. Recruit 3 to 5
real travel groups, and have each go through at least one trip.

| Metric                      | How it is measured                                                                           | MVP target  |
|-----------------------------|----------------------------------------------------------------------------------------------|-------------|
| Group activation            | Share of groups where at least 3 people join and add places within 7 days of creating a trip | 70% or more |
| Place pool participation    | Average places added per person in each group                                                | 5 or more   |
| Ticket upload rate          | Share of booked items whose ticket was uploaded                                              | 80% or more |
| Ticket recognition accuracy | Share of recognized results confirmed without edits                                          | 85% or more |
| AI draft acceptance         | Share of itinerary skeletons and quick notes used unchanged or with small edits              | 60% or more |
| On-site use                 | Share of members who open Footnote each day of the trip                                      | 60% or more |
| Album completion            | Share of groups that generate and share an album after the trip                              | 60% or more |
| Intent to use again         | Share answering "yes" to "would you use it on your next trip"                                | 80% or more |

**Qualitative questions to record during the trial.** Which step made
people want to quit? Which step did users skip AI for and do by hand?
Was the conflict prompt easy to understand? These answers will guide
phase 2 better than the numbers.

These targets are my starting point for a small trial. Adjust them to
your situation before the trial begins.

## 12. Decisions

**Decided (October 29):**

- Build first for yourself and friends, not for the public.

- The interface is bilingual, in Chinese and English.

- The product name is Footnote (行迹).

- Users can connect their own AI (their own API key and an MCP
  > connector), so friends do not pay much for AI.

- Users decide the style of their own albums. AI only recommends.

- Original photos are kept by default.

- Expense log and splitting are part of the product, in phase 2.

- The memory space scene is chosen by the user and is not limited to a
  > study. Footnote provides several scenes.

- All music sources are supported: save the share link, play inside the
  > page where embedding is allowed, and open the app otherwise.

**Still open. These affect the scope of development:**

- **Build it yourself, or make a clickable prototype first?** A
  > prototype is recommended first, to confirm three core experiences:
  > the itinerary timeline, ticket-driven time changes and the album.

- **AI budget.** In phase 1 the developer pays for AI, so decide a
  > monthly cost limit per trip. It does not apply when users connect
  > their own AI.

- **Name check.** Check domain names, trademarks and app names before
  > launch. "Footnote" is a common English word and may already be
  > taken, so prepare an alternative spelling.

- **Who draws the scenes.** Several selectable scenes (a study, a cafe,
  > an attic, a seaside cabin and so on) each need illustration and
  > motion work, so the effort grows with the number of scenes. Draw
  > them yourself, hire an illustrator, or start with one or two still
  > illustrations? Recommended after the MVP, with the first album as a
  > web page.
