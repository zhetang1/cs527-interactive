# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A static multi-page web app (`webapp/`) that interactively teaches CS 527 Database Systems concepts. No build step — open any HTML file directly in a browser.

## Files

- `webapp/index.html` — landing page with cards linking to each topic
- `webapp/styles.css` — shared CSS (dark theme, CSS variables, reusable components)
- `webapp/btree.html` — B+ Tree (insert, delete, search with step-by-step animation)
- `webapp/bloom.html` — Bloom Filter (bit array, k hash functions, false positives)
- `webapp/hashtable.html` — Hash Tables (linear probe, chained, cuckoo, extendible)
- `webapp/bufferpool.html` — Buffer Pool (LRU, Clock, LRU-K replacement policies)
- `webapp/joins.html` — Join Algorithms (Nested Loop, Sort-Merge, Hash Join)
- `webapp/sorting.html` — External Merge Sort (two-pass: create runs, merge)
- `webapp/locking.html` — Two-Phase Locking (schedule simulator, lock compat, deadlock)

## Architecture

All pages are self-contained vanilla JS + HTML — no frameworks, no build tools, no npm. Each page:
1. Imports `styles.css` for the shared dark-theme design system
2. Contains all algorithm logic inline in a `<script>` block
3. Uses SVG for tree/graph renders and CSS for all other visualizations
4. Animates via `async/await + setTimeout` sleep patterns

### CSS Design System (`styles.css`)
Uses CSS variables (`--bg`, `--surface`, `--accent`, `--accent3`, etc.) for theming. Key reusable classes: `.card`, `.btn`, `.explanation`, `.stats`/`.stat`, `.tabs`/`.tab`, `.slot`, `.legend`.

### Algorithm implementations (all in-browser)
- **B+ Tree**: full insert/delete/search with split and merge. Returns step arrays that the UI replays. Layout is computed by a recursive `layoutTree()` → SVG renderer.
- **Bloom Filter**: `hashStr()` with multiple seeds. Insert/lookup with async per-hash animations.
- **Hash Tables**: each scheme (linear probe, chained, cuckoo, extendible) is an independent state machine with async step animations.
- **Buffer Pool**: frame array + policy-specific eviction logic (`lruOrder` list for LRU, `clockHand` pointer for Clock, access `history[]` for LRU-K).
- **Joins**: async generators that animate tuple-by-tuple comparison.
- **2PL**: lock manager (`simLocks` dict), waits-for graph builder, cycle detector via DFS.

## Source Material

All content is derived from CS 527 (Database Systems, Fall 2025) lecture PDFs in the parent directory. Extract PDF text with `pdftotext` (requires poppler: `brew install poppler`).
