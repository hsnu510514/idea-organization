# Murder Board

A tactile spatial workspace modeled after a detective's investigation board, where cards of various physical paper and photo media are pinned, arranged, annotated, and linked with yarn strings.

## Language

### Workspace & Storage

**Workspace**:
The root folder on disk that contains one or more cases.
_Avoid_: Database, repository, project root

**Case**:
A single investigation stored as a self-contained directory (`board.json` plus an `assets/` folder) representing one board, its cards, strings, and stashed items.
_Avoid_: Project, file, session, workspace

**Asset**:
A raw uploaded source file (such as an original PDF or image) stored once in a case's `assets/` directory and referenced by one or more cards.
_Avoid_: Blob, upload, attachment, media file

**Case Drawer**:
A collapsible storage drawer (styled like a manila file drawer at the edge of the screen) that holds unpinned cards and uploaded assets off the board, and indexes all items for searching and filtering.
_Avoid_: Sidebar, file manager, inventory, library, panel

### Board & Spatial Items

**Board**:
The primary corkboard surface where cards are pinned, arranged, and connected, operating in either a bounded wooden-frame mode or an infinite surface mode.
_Avoid_: Canvas, page, screen, wall

**Card**:
Any physical-style item placed on the board or stashed in the case drawer—specifically a Sticky Note, A4 Document, Index Card, Newspaper Clipping, Photo Print, or PDF Stack.
_Avoid_: File, node, widget, element, post

**PDF Stack**:
A card backed by a PDF asset, displayed as a physical stack of sheets (for all pages or a chosen page range) that can be flipped through in place on the board.
_Avoid_: PDF viewer, document embed, file preview

**Clipping**:
A card created by extracting a single page or cropping a rectangular region from a PDF stack.
_Avoid_: Screenshot, slice, crop, sub-file

### Connections & Markings

**Pin**:
A thumbtack attached to a card that anchors it to the board and serves as an attachment point for strings. Each card has a movable default pin and may hold additional pins.
_Avoid_: Anchor, port, handle, connector point

**String**:
A piece of sagging colored yarn stretched between two pins to represent a connection between cards, optionally bearing a short tape/tag label. When a connected card is stashed in the case drawer, its strings are remembered and restored when the card is pinned back to the board.
_Avoid_: Edge, line, arrow, link, wire

**Annotation**:
Hand-drawn ink strokes or sketchy shapes (such as marker circles, ovals, or underlines) drawn directly onto a card (moving and rotating with it) or onto the board surface.
_Avoid_: Drawing, doodle, overlay, vector shape

