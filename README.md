# Gemini Ultimate: Unified Renderer & Theme Engine (v5.0)

Gemini Ultimate v5.0 is an enterprise-grade Userscript designed for `gemini.google.com`. It introduces an advanced presentation layer, interactive rendering engines, and rigorous performance enhancements to transform raw AI outputs into developer-friendly visual workspaces.

## Core Architectural Modules

The script is meticulously isolated within an Immediately Invoked Function Expression (IIFE) to prevent scope pollution and divides its capabilities into 14 functional layers:

### 1. Unified presentación & Theme Engine
* **Gruvbox & VS2022 Hybrid Theme**: Inject Industrial-dark UI style sheets using `GM_addStyle`. Implements cohesive design constants for typography, syntax coloring, and semantic tokens.
* **Progressive Disclosure Input Area**: Real-time styling optimization that shrinks the input container when inactive to maximize screen real estate, unfolding smoothly upon focus.

### 2. State-Driven Unified Multi-Renderer Pipeline (`RendererStrategy`)
* **Interactive HTML Renderer**: Captures source code, builds an isolated container, and pipes it via Blob URL to a sandboxed iframe, effectively bypassing Google's strict Content Security Policy (CSP).
* **Advanced Mermaid Diagram Render & Live View**: Detects flowcharts, mindmaps, and sequence diagrams. It injects a localized interactive viewer supporting matrix translations (pan, pinch-to-zoom, scroll-scaling) and features one-click syncing directly to `mermaid.live`.
* **Dynamic Markdown Preview Engine**: Seamlessly imports `Marked.js` via an asynchronous module fallback pipeline (ESM / Polyfill Script Injection) to provide full inline previews for markdown outputs.
* **RFC 4180 Compliant CSV Datatable Viewer**: Implements a zero-dependency deterministic parser for processing multi-line escaped CSV text, building a high-performance visual datatable instantly.

### 3. Industrial Data-Ink Ratio Table Optimization
* **Sticky Header with Frost-Glass Blur**: Keeps large dataset headers frozen during vertical scrolling with hardware-accelerated background filtering.
* **Crosshair Multi-Axis Highlighting**: Employs an ultra-low overhead CSS pointer-tracking architecture (`:hover::after`) to draw infinite row/column intersections, resolving visual skipping on ultra-wide screens.
* **Data Serialization Toolkit**: Implements cross-platform table data copying and automated client-side standard CSV export functions.

### 4. Smart Code Lifecycle Management (`Processor`)
* **Intelligent Layout Shrinking**: Detects code lengths dynamically; blocks exceeding 15 lines are encapsulated in a scroll-locked container with adaptive unfold mechanics.
* **Non-Invasive UI Injection Layer**: Custom actions are mounted into a decoupled HTML overlay layout, bypassing host layout shifts and eliminating clip-path issues.
* **Asynchronous DOM Scanning Pipeline**: Monitors runtime UI additions using a debounced `MutationObserver` combined with segmented micro-task scheduling to safeguard the main thread from thread-blocking overhead.

## Deployment Technical Requirements

* **Host Dependency**: Tampermonkey / Violentmonkey Engine
* **Execution Phase**: `document-start`
* **External Network Connects**: `cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`, `esm.sh`, `image.pollinations.ai`