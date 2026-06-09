// ==UserScript==
// @name         Gemini Ultimate: Unified Renderer & Theme v5.0
// @namespace    http://tampermonkey.net/
// @version      5.0.0
// @description  Advanced Gemini UI feature set with Gruvbox/VS2022 themes, interactive Mermaid/HTML rendering, code folding, and cross-browser support.
// @author       Unified Integration Pro
// @match        https://gemini.google.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @grant        GM_info
// @grant        GM_addStyle
// @connect      cdn.jsdelivr.net
// @connect      unpkg.com
// @connect      cdnjs.cloudflare.com
// @connect      esm.sh
// @connect      image.pollinations.ai
// @connect      *
// @license      MIT
// @run-at       document-start
// @compatible   chrome Desktop & Mobile (完全兼容)
// @compatible   firefox Desktop & Mobile (完全兼容)
// @compatible   safari Desktop & Mobile (iOS Blob Mode)
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// ==/UserScript==

/**
 * Core Architecture Overview
 * § 0 Config | § 1 Trusted Types | § 2 CSS Injection | § 3 Network Wrapper
 * § 4-6 Mermaid Rendering & Interactive Viewer | § 7 HTML Rendering
 * § 8 Pollinations API | § 9 Render Buttons | § 10-11 Core Utils & Components
 * § 12 DOM Processor & Shadow DOM | § 13 Initialization & Observers
 */

(function () {
    'use strict';

    /* --- § 0. Base Configuration --- */
    const CONFIG = {
        /* 偵錯 */
        DEBUG: true,

        /* 渲染器 */
        REQUEST_TIMEOUT: 30000,
        RENDER_TIMEOUT:  20000,

        /* 主題 / 折疊 */
        FOLD_THRESHOLD: 15,
        DEBOUNCE_MS:    300,

        /* 重試（Chrome 延遲處理） */
        MAX_RETRIES:  3,
        RETRY_DELAY:  100,

        /* 瀏覽器偵測 */
        IS_IOS:     /iPad|iPhone|iPod/.test(navigator.userAgent),
        IS_SAFARI:  /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
        IS_MOBILE:  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        IS_TOUCH:   ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
        IS_CHROME:  /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
        IS_FIREFOX: /Firefox/.test(navigator.userAgent),

        USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

        /* Mermaid CDN 備份清單 */
        MERMAID_CDNS: [
            'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js',
            'https://unpkg.com/mermaid@11/dist/mermaid.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.0.0/mermaid.min.js'
        ]
    };

    const log = (...args) => CONFIG.DEBUG && console.log('[Gemini v5.0]', ...args);

    /* --- § 1. Trusted Types Initialization --- */
    (function initTrustedTypes() {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            try {
                if (!window.trustedTypes.defaultPolicy) {
                    window.trustedTypes.createPolicy('default', {
                        createHTML:      s => s,
                        createScript:    s => s,
                        createScriptURL: s => s
                    });
                }
            } catch (e) {
                log('Trusted Types default policy warning:', e);
            }
        }
    })();

    let _trustedPolicy;
    function getTrustedPolicy() {
        if (_trustedPolicy) return _trustedPolicy;
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            try {
                _trustedPolicy = window.trustedTypes.createPolicy('gemini-unified-v5', {
                    createHTML:      s => s,
                    createScript:    s => s,
                    createScriptURL: s => s
                });
            } catch (e) {
                _trustedPolicy = (window.trustedTypes && window.trustedTypes.defaultPolicy) || null;
            }
        }
        return _trustedPolicy;
    }

    function safeSetHTML(el, html) {
        const p = getTrustedPolicy();
        el.innerHTML = p ? p.createHTML(html) : html;
    }

    /* --- § 2. CSS Injection (Themes & Component Styles) --- */
    const CSS_MAIN = `
    /* ── 全域變量 ── */
    :root {
        --bg-primary:   #1d2021;
        --bg-secondary: #282828;
        --bg-tertiary:  #3c3836;
        --surface-dark: #1a1b1d;
        --text-primary:   #fbf1c7;
        --text-secondary: #ebdbb2;
        --text-muted:     #a89984;
        --accent-red:    #fb4934;
        --accent-green:  #b8bb26;
        --accent-yellow: #fabd2f;
        --accent-blue:   #83a598;
        --accent-purple: #d3869b;
        --accent-aqua:   #8ec07c;
        --accent-orange: #fe8019;
        --vs-bg:         #1E1E1E;
        --vs-fg:         #D4D4D4;
        --vs-border:     #3E3E42;
        --vs-blue:       #569CD6;
        --vs-blue-light: #9CDCFE;
        --vs-green:      #6A9955;
        --vs-orange:     #CE9178;
        --vs-yellow:     #DCDCAA;
        --vs-teal:       #4EC9B0;
        --vs-mint:       #B5CEA8;
        --font-code: 'Cascadia Code', 'CommitMono', 'Menlo', monospace;
        --font-body: 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', sans-serif;
        --base-font-size: 0.95rem;
        --line-height:    1.3;
        --spacing-unit:   0.4rem;
        --border-color:   var(--vs-border);
    }

    /* ── Chrome 渲染修復 ── */
    * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
    .model-response-text, markdown-renderer, .markdown-renderer {
        display: block !important; transform: translateZ(0); backface-visibility: hidden; will-change: contents;
    }

    /* ── 容器寬度 ── */
    div[class*="conversation-container"], [class*="conversation-container"],
    div[class^="conversation-container"], .conversation-container,
    .chat-history, .response-container, message-set {
        max-width: 100% !important; width: 100% !important; min-width: 100% !important;
        padding-left: 1rem !important; padding-right: 1rem !important; box-sizing: border-box !important;
    }

    /* ── Markdown 基礎 ── */
    .model-response-text, markdown-renderer, .markdown-renderer {
        color: var(--text-secondary) !important; font-family: var(--font-body) !important;
        line-height: var(--line-height) !important; font-size: var(--base-font-size) !important;
    }

    /* ── 標題系統 ── */
    .model-response-text h1, markdown-renderer h1 {
        color: var(--accent-red) !important; font-weight: 800 !important; font-size: 1.75rem !important;
        margin-top: 1.5rem !important; margin-bottom: var(--spacing-unit) !important;
        border-bottom: 2px solid var(--bg-tertiary); padding-bottom: 0.5rem; line-height: 1.3;
    }
    .model-response-text h2, markdown-renderer h2 {
        color: var(--accent-blue) !important; font-weight: 700 !important; font-size: 1.5rem !important;
        margin-top: 1.25rem !important; margin-bottom: 0.6rem !important; line-height: 1.35;
    }
    .model-response-text h3, markdown-renderer h3 {
        color: var(--accent-yellow) !important; font-weight: 600 !important; font-size: 1.25rem !important;
        margin-top: 1rem !important; margin-bottom: 0.5rem !important; line-height: 1.4;
    }
    .model-response-text h4, markdown-renderer h4 {
        color: var(--accent-green) !important; font-weight: 600 !important;
        font-size: 1.1rem !important; margin-top: 0.875rem !important;
    }
    .model-response-text p, markdown-renderer p { margin-bottom: var(--spacing-unit) !important; line-height: var(--line-height); }
    .model-response-text strong, markdown-renderer strong,
    .model-response-text b, markdown-renderer b { color: var(--accent-orange) !important; font-weight: 700 !important; }
    .model-response-text em, markdown-renderer em { color: var(--accent-purple) !important; font-style: italic; }
    .model-response-text a, markdown-renderer a {
        color: var(--accent-aqua) !important; text-decoration: none !important;
        border-bottom: 1px dashed var(--accent-aqua); transition: all 0.2s ease; padding-bottom: 1px;
    }
    .model-response-text a:hover, markdown-renderer a:hover { background: rgba(142,192,124,0.15); border-bottom-style: solid; }

    /* ── 列表 ── */
    .model-response-text ul, markdown-renderer ul,
    .model-response-text ol,  markdown-renderer ol {
        margin: var(--spacing-unit) 0 !important; margin-left: 1.5rem !important; padding-left: 0.5rem !important;
    }
    .model-response-text li, markdown-renderer li { margin-bottom: 0.4rem !important; line-height: var(--line-height); }
    .model-response-text li::marker, markdown-renderer li::marker { color: var(--accent-purple) !important; font-weight: 600; }

    /* ── 引用 ── */
    .model-response-text blockquote, markdown-renderer blockquote {
        border-left: 4px solid var(--accent-purple) !important;
        background: rgba(60,56,54,0.35) !important; color: var(--text-muted) !important;
        margin: var(--spacing-unit) 0 !important; padding: var(--spacing-unit) 1rem !important;
        border-radius: 0 0.5rem 0.5rem 0; font-style: italic; line-height: var(--line-height);
    }

    /* ── 表格（通用：工業級修復 Hover 重繪 Bug / 格線長駐） ── */
    /* 1. 父容器控制水平滾動，避免 table 自我 block 化 */
    .table-block, .tm-table-wrapper {
        overflow-x: auto !important;
        width: 100% !important; max-width: 100% !important;
        box-sizing: border-box !important;
        border-radius: 0.5rem;
        box-shadow: 0 0.25rem 0.5rem rgba(0,0,0,0.3);
        border: 2px solid var(--border-color) !important;
        margin: var(--spacing-unit) 0 !important;
        background: var(--bg-primary);
        position: relative;
    }
    /* 2. 表格回歸標準表結構，放棄 collapse 避免 Chrome Reflow Bug */
    .model-response-text table, markdown-renderer table, table {
        border-collapse: separate !important;
        border-spacing: 0 !important;
        width: 100% !important; min-width: 100% !important;
        display: table !important; /* 核心修復：使用 table 而非 block */
        background: transparent !important;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        table-layout: fixed;
    }
    /* 3. 獨立繪製單元格邊界 (Separated Grid Pattern) */
    .model-response-text th, .model-response-text td,
    markdown-renderer th, markdown-renderer td, th, td {
        border: none !important;
        border-bottom: 1px solid var(--border-color) !important;
        border-right: 1px solid var(--border-color) !important;
        padding: 0.75rem 1rem !important;
        font-family: var(--font-body) !important;
        font-size: var(--base-font-size) !important;
        word-break: break-word;
        vertical-align: middle !important;
    }
    /* 消除邊角多餘格線 */
    th:last-child, td:last-child { border-right: none !important; }
    tr:last-child td { border-bottom: none !important; }

    th {
        background: linear-gradient(135deg, #3c3836 0%, #282828 100%) !important;
        color: var(--accent-green) !important; font-weight: 700 !important;
        text-transform: uppercase; letter-spacing: 0.05em;
        border-bottom: 2px solid var(--accent-green) !important;
        position: sticky; top: 0; z-index: 2;
    }
    td { background: var(--bg-primary) !important; color: var(--text-secondary) !important; }

    /* 4. 斑馬紋與加強 Hover 提供常駐對比色 */
    tr:nth-child(even) td { background: var(--bg-secondary) !important; }
    tr:hover td { background: rgba(254,128,25,0.12) !important; transition: background 0.15s ease; }

    /* ── 表格（Gemini 舊版相容防禦） ── */
    .table-block.new-table-style {
        border: none !important; margin: 0 !important; box-shadow: none !important; display: block !important;
        overflow-x: hidden !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important;
    }
    .table-block.new-table-style table, table.table-block.new-table-style {
        display: table !important; width: 100% !important; min-width: 100% !important;
        table-layout: fixed !important; margin: 0 !important; box-sizing: border-box !important;
    }
    .table-block.new-table-style th,
    .table-block.new-table-style td {
        white-space: normal !important; overflow-wrap: break-word !important;
        word-wrap: break-word !important; word-break: break-word !important; max-width: 0 !important;
    }

    /* ── 代碼（行內 / 塊） ── */
    code { font-family: var(--font-code) !important; font-size: 0.875rem !important; font-variant-ligatures: common-ligatures; }
    :not(pre) > code {
        color: var(--accent-yellow) !important; background: rgba(40,40,40,0.85) !important;
        border: 1px solid rgba(250,189,47,0.3) !important; padding: 0.15em 0.4em !important;
        border-radius: 0.25rem !important; font-size: 0.875em !important; font-weight: 500;
    }
    pre {
        background: var(--vs-bg) !important; border: 1px solid var(--vs-border) !important;
        border-radius: 0.5rem; padding: 1rem !important; margin: var(--spacing-unit) 0 !important;
        overflow-x: auto !important; transition: max-height 0.3s ease-in-out;
        font-size: 0.875rem !important; line-height: 1.5 !important;
        transform: translateZ(0); box-shadow: 0 0.25rem 0.5rem rgba(0,0,0,0.3); position: relative;
    }

    /* ── VS2022 語法高亮 ── */
    .hljs-keyword   { color: var(--vs-blue)       !important; font-weight: 600; }
    .hljs-built_in  { color: var(--vs-teal)       !important; }
    .hljs-type      { color: var(--vs-teal)       !important; }
    .hljs-literal   { color: var(--vs-blue)       !important; }
    .hljs-number    { color: var(--vs-mint)       !important; }
    .hljs-string    { color: var(--vs-orange)     !important; }
    .hljs-comment   { color: var(--vs-green)      !important; font-style: italic; opacity: 0.85; }
    .hljs-function  { color: var(--vs-yellow)     !important; font-weight: 500; }
    .hljs-title     { color: var(--vs-yellow)     !important; }
    .hljs-params    { color: var(--vs-blue-light) !important; }
    .hljs-variable  { color: var(--vs-blue-light) !important; }
    .hljs-tag       { color: var(--vs-blue)       !important; }
    .hljs-attr      { color: var(--vs-blue-light) !important; }
    .hljs-attribute { color: var(--vs-blue-light) !important; }
    .hljs-regexp    { color: var(--vs-orange)     !important; }
    .hljs-symbol    { color: var(--vs-blue-light) !important; }
    .hljs-class     { color: var(--vs-teal)       !important; font-weight: 500; }

    /* ── 代碼折疊 ── */
    .tm-code-container-collapsed {
        max-height: 22.5rem !important; overflow-y: auto !important;
        border-bottom: 2px dashed var(--vs-border); position: relative;
    }
    .tm-code-container-expanded { max-height: none !important; overflow-y: visible !important; }

    /* ── 統一滾動條 ── */
    pre::-webkit-scrollbar, table::-webkit-scrollbar, .tm-code-container-collapsed::-webkit-scrollbar { height: 8px; width: 8px; }
    pre::-webkit-scrollbar-track, table::-webkit-scrollbar-track, .tm-code-container-collapsed::-webkit-scrollbar-track { background: var(--bg-tertiary); border-radius: 4px; }
    pre::-webkit-scrollbar-thumb, table::-webkit-scrollbar-thumb, .tm-code-container-collapsed::-webkit-scrollbar-thumb { background: var(--accent-yellow); border-radius: 4px; }
    pre::-webkit-scrollbar-thumb:hover, table::-webkit-scrollbar-thumb:hover, .tm-code-container-collapsed::-webkit-scrollbar-thumb:hover { background: var(--accent-orange); }

    /* ── Mermaid 容器（頁面內靜態顯示） ── */
    .mermaid {
        background-color: var(--vs-bg) !important; border: 1px solid var(--vs-border) !important;
        border-radius: 0.5rem; padding: 1.5rem !important; margin: var(--spacing-unit) 0 !important;
        overflow-x: auto !important; transform: translateZ(0); box-shadow: 0 0.25rem 0.5rem rgba(0,0,0,0.3);
    }
    .mermaid svg { font-family: var(--font-body) !important; max-width: 100%; height: auto; }
    .mermaid .node rect, .mermaid .node circle, .mermaid .node ellipse, .mermaid .node polygon { fill: var(--vs-teal) !important; stroke: var(--vs-border) !important; stroke-width: 2px; }
    .mermaid .node .label, .mermaid text { fill: var(--vs-fg) !important; font-size: 14px !important; }
    .mermaid .edgeLabel { background-color: var(--vs-bg) !important; color: var(--vs-fg) !important; }
    .mermaid path.path, .mermaid line { stroke: var(--vs-blue-light) !important; stroke-width: 2px; }
    .mermaid .arrowheadPath { fill: var(--vs-blue-light) !important; }

    /* --- Component Buttons (Mermaid Live, Fold) --- */
    .tm-action-btn {
        display: inline-flex !important; align-items: center; gap: 0.375rem;
        padding: 0.375rem 0.75rem; margin-left: 0.5rem;
        color: #1d2021 !important; border: 1px solid var(--border-color);
        border-radius: 0.375rem; font-size: 0.85rem !important; font-weight: 600;
        font-family: var(--font-body); cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.3);
        z-index: 1000 !important; user-select: none;
        -webkit-tap-highlight-color: transparent;
        transform: translateZ(0); position: relative;
        visibility: visible !important; opacity: 1 !important;
    }
    .tm-action-btn svg { width: 1rem; height: 1rem; fill: currentColor; flex-shrink: 0; }
    .tm-action-btn:hover, .tm-action-btn:active {
        transform: translateY(-2px) translateZ(0); filter: brightness(1.15);
        box-shadow: 0 0.25rem 0.5rem rgba(0,0,0,0.4);
    }
    .tm-btn-mermaid  { background: linear-gradient(135deg, var(--accent-green) 0%, #8f9a1e 100%) !important; }
    .tm-btn-fold     { background: linear-gradient(135deg, var(--accent-orange) 0%, #d65d0e 100%) !important; }
    .tm-btn-fold.is-expanded {
        background: linear-gradient(135deg, var(--bg-tertiary) 0%, #504945 100%) !important;
        color: var(--text-secondary) !important;
    }
    .tm-loading { opacity: 0.65 !important; pointer-events: none; cursor: wait; filter: grayscale(0.3); }
    .tm-btn-text-full { display: inline !important; }
    .tm-btn-text-short { display: none !important; }

    /* ── Overlay 容器（fallback 時覆蓋在 pre 右上角） ── */
    .tm-overlay {
        position: absolute !important; top: 0.5rem !important; right: 0.5rem !important;
        z-index: 999 !important; display: flex !important; flex-direction: row !important;
        gap: 0.5rem !important; pointer-events: none;
    }
    .tm-overlay > * { pointer-events: auto; }

    /* ── Chrome 強制渲染 ── */
    @supports (-webkit-appearance:none) {
        .tm-action-btn { -webkit-transform: translateZ(0); -webkit-backface-visibility: hidden; }
        .tm-overlay    { -webkit-transform: translateZ(0); }
    }

    /* ── Toast 通知 ── */
    .tm-ml-toast {
        position: fixed; right: 1rem; bottom: 1.5rem; z-index: 99999;
        background: rgba(29,32,33,0.96); color: var(--text-primary);
        border: 1px solid var(--accent-yellow); border-left: 4px solid var(--accent-green);
        padding: 0.75rem 1rem; border-radius: 0.5rem;
        box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.6);
        font-family: var(--font-body); font-size: 0.875rem; line-height: 1.4;
        opacity: 0; transform: translateY(1.25rem);
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        pointer-events: none; backdrop-filter: blur(8px); max-width: 320px;
    }
    .tm-ml-toast.tm-show { opacity: 1; transform: translateY(0); }
    .tm-ml-toast strong  { color: var(--accent-yellow) !important; display: block; margin-bottom: 0.25rem; }

    /* ── UI 清理 ── */
    .location-footer-name, .location-buttons-dot, span.bard-hello { display: none !important; }

    /* ── 觸控 & 焦點 ── */
    .tm-action-btn:active, .model-response-text a:active { transform: scale(0.96); }
    .tm-action-btn:focus-visible { outline: 2px solid var(--accent-yellow); outline-offset: 2px; }

    /* ── 輸入框 ── */
    div[role="textbox"], textarea, .ql-editor {
        min-height: 5rem !important; max-height: 50vh !important; padding: 1rem !important;
        font-size: 1rem !important; line-height: 1.6 !important; border-radius: 0.75rem !important;
        background-color: var(--bg-secondary) !important; border: 0.125rem solid transparent !important;
        transition: all 0.2s cubic-bezier(0.4,0,0.2,1) !important;
    }
    div[role="textbox"]:focus, div[role="textbox"]:focus-within, textarea:focus {
        background-color: var(--bg-tertiary) !important; border-color: var(--accent-yellow) !important;
        box-shadow: 0 0 0 0.25rem rgba(250,189,47,0.15) !important; outline: none !important;
    }

    /* --- Interactive Renderer Styles --- */

    /* 互動圖表 / 渲染 按鈕（注入 code-block-decoration） */
    .gemini-render-button {
        margin-left: 8px; margin-right: 4px; cursor: pointer;
        padding: 4px 10px;
        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
        color: #fff; border: none; border-radius: 6px;
        font-size: 12px; font-weight: 600; opacity: 0.95;
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        box-shadow: 0 2px 8px rgba(79,70,229,0.35);
        display: inline-flex; align-items: center; justify-content: center; gap: 4px;
        -webkit-tap-highlight-color: transparent;
        position: relative; overflow: hidden;
        height: 26px; line-height: 1; white-space: nowrap; box-sizing: border-box;
    }
    .gemini-render-button::before {
        content: ''; position: absolute; top: 50%; left: 50%;
        width: 0; height: 0; border-radius: 50%;
        background: rgba(255,255,255,0.3);
        transform: translate(-50%,-50%);
        transition: width 0.6s, height 0.6s;
    }
    .gemini-render-button:active::before { width: 300px; height: 300px; }
    .gemini-render-button:hover:not(:disabled) { opacity: 1; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,70,229,0.45); }
    .gemini-render-button:disabled { background: linear-gradient(135deg,#9CA3AF 0%,#6B7280 100%); cursor: not-allowed; opacity: 0.7; box-shadow: none; }
    .gemini-mermaid-button { background: linear-gradient(135deg,#06B6D4 0%,#0891B2 100%); box-shadow: 0 2px 8px rgba(6,182,212,0.35); }
    .gemini-mermaid-button:hover:not(:disabled) { box-shadow: 0 4px 12px rgba(6,182,212,0.45); }

    /* 預覽容器 */
    .gemini-preview-container {
        width: 100%; max-width: 100%; box-sizing: border-box; margin-top: 16px;
        border: 2px solid #E5E7EB; border-radius: 16px; overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1), 0 1px 8px rgba(0,0,0,0.06);
        background-color: #fff; position: relative;
        animation: geminiSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes geminiSlideIn {
        from { opacity: 0; transform: translateY(-20px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    .gemini-preview-iframe    { width: 100%; max-width: 100%; box-sizing: border-box; height: 650px; border: none; display: block; background: linear-gradient(135deg,#F9FAFB 0%,#F3F4F6 100%); }
    .gemini-preview-controls  { padding: 16px 20px; background: linear-gradient(135deg,#1E293B 0%,#334155 100%); font-size: 14px; display: flex; gap: 12px; align-items: center; color: #fff; flex-wrap: wrap; }
    .gemini-control-button    { padding: 8px 16px; background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.3s ease; -webkit-tap-highlight-color: transparent; backdrop-filter: blur(12px); }
    .gemini-control-button:hover, .gemini-control-button:active { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .gemini-control-button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .gemini-preview-overlay   { flex-grow: 1; text-align: left; font-weight: 600; min-width: 150px; display: flex; align-items: center; gap: 8px; }
    .gemini-preview-error     { padding: 20px; color: #DC2626; background: linear-gradient(135deg,#FEE2E2 0%,#FECACA 100%); border-left: 5px solid #EF4444; border-radius: 12px; font-family: 'Menlo','Monaco','Courier New',monospace; white-space: pre-wrap; text-align: left; font-size: 13px; line-height: 1.8; margin: 20px; box-shadow: 0 4px 12px rgba(220,38,38,0.15); }
    .gemini-preview-success   { color: #fff; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .gemini-loading-spinner   { display: inline-block; width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.25); border-top: 3px solid #fff; border-radius: 50%; animation: geminiSpin 0.8s linear infinite; }
    @keyframes geminiSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    .gemini-ios-badge         { background: rgba(16,185,129,0.2); padding: 4px 10px; border-radius: 12px; font-size: 11px; border: 1px solid rgba(16,185,129,0.4); color: #10B981; }

    /* ── 手機版代碼區塊縮小 (iOS/Mobile UI Size Reduction) ── */
    @media (max-width: 768px) {
        pre {
            padding: 0.2rem !important;
            font-size: 0.2rem !important;
            border-radius: 0.1rem !important;
        }
        code { font-size: 0.2rem !important; }
        :not(pre) > code { font-size: 0.2em !important; padding: 0.03em 0.1em !important; }
        .tm-action-btn { padding: 0.08rem 0.5rem !important; font-size: 0.2rem !important; }
        .tm-action-btn svg { width: 0.25rem; height: 0.25rem; }
        .tm-code-container-collapsed { max-height: 3.4rem !important; }
        .tm-overlay { top: 0.08rem !important; right: 0.08rem !important; }
    }

    /* ── § 附加優化：輸入框動態縮放 (Progressive Disclosure) ── */
    /* 鎖定 Gemini 核心輸入容器 */
    .ds-chat-input-container, rich-textarea, .chat-input-container {
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        transform-origin: bottom center;
    }
    /* 當沒有焦點且沒有包含特定文字標記時，縮小體積 */
    rich-textarea:not(:focus-within) .ql-editor:empty {
        min-height: 2.5rem !important;
        height: 2.5rem !important;
        padding-top: 0.5rem !important;
        padding-bottom: 0.5rem !important;
        opacity: 0.6;
    }
    rich-textarea:not(:focus-within):hover .ql-editor:empty {
        opacity: 1;
    }

    /* ── § 附加優化：表格工業級視覺升級 (Data-Ink Ratio) ── */
    .model-response-text table, markdown-renderer table {
        overflow: hidden !important; /* 為十字高亮建立遮罩 */
    }
    /* 1. 表頭凍結與毛玻璃效果 */
    .model-response-text th {
        position: sticky !important;
        top: 0 !important;
        z-index: 10 !important;
        backdrop-filter: blur(8px) !important;
        background: rgba(60, 56, 54, 0.95) !important; /* 使用你原有的 --bg-tertiary 帶透明度 */
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }
    /* 2. 十字線高亮 (Crosshair Highlight) - 解決寬表格閱讀跳行問題 */
    .model-response-text td {
        position: relative !important;
    }
    /* 垂直高亮 */
    .model-response-text td:hover::after {
        content: "";
        position: absolute;
        background-color: rgba(250, 189, 47, 0.08) !important; /* 使用 --accent-yellow 作為高亮基底 */
        left: 0;
        top: -5000px;
        height: 10000px;
        width: 100%;
        z-index: -1;
        pointer-events: none;
    }
    /* 3. 表格工具列容器 (Hover 顯示) */
    .tm-table-toolbar {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        display: flex;
        gap: 0.5rem;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 20;
    }
    .table-block:hover .tm-table-toolbar, 
    .tm-table-wrapper:hover .tm-table-toolbar {
        opacity: 1;
    }

    /* ── § 進階視圖切換 UX (State-Driven View Toggle) ── */
    .tm-view-container {
        position: relative;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tm-raw-view, .tm-preview-view {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tm-preview-view {
        display: none; /* 預設隱藏 */
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin-top: 0.5rem;
        color: var(--text-secondary);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        overflow-x: auto;
        overflow-wrap: break-word;
        word-break: break-word;
    }
    /* 為 Markdown 的內容提供限制，避免圖片或表格超出邊界 */
    .tm-preview-view img { max-width: 100%; height: auto; }
    .tm-preview-view pre, .tm-preview-view code { max-width: 100%; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; box-sizing: border-box; }
    .tm-preview-view table { display: block; max-width: 100%; overflow-x: auto; box-sizing: border-box; }

    /* 雙面卡片模式 (Inline) Markdown / CSV */
    .tm-state-inline-preview .tm-raw-view { display: none; }
    .tm-state-inline-preview .tm-preview-view {
        display: block;
        animation: tmFadeInUp 0.3s forwards;
    }
    
    /* Iframe 渲染模式 Mermaid / HTML */
    .tm-state-iframe-preview .tm-raw-view { display: none; }
    .tm-state-iframe-preview .tm-preview-view { display: none !important; }

    @keyframes tmFadeInUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* ── § 渲染器按鈕樣式擴充 ── */
    .gemini-md-button { background: linear-gradient(135deg,#10B981 0%,#059669 100%); }
    .gemini-csv-button { background: linear-gradient(135deg,#F59E0B 0%,#D97706 100%); }
    `;

    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(CSS_MAIN);
    } else {
        const s = document.createElement('style');
        s.textContent = CSS_MAIN;
        (document.head || document.documentElement).appendChild(s);
    }

    /* --- § 資源依賴管理器 --- */
    const DependencyManager = {
        _markedModule: null,
        async loadMarked() {
            if (this._markedModule) return this._markedModule;
            if (window.marked) {
                this._markedModule = window.marked;
                return window.marked;
            }

            // Method 1: import
            try {
                const mod = await import('https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js');
                this._markedModule = mod.marked ? mod.marked : mod;
                return this._markedModule;
            } catch(e) {
                console.warn('[Gemini Ultimate] Dynamic import (Method 1) failed:', e);
            }

            // Method 2: import from esm.sh
            try {
                const mod = await import('https://esm.sh/marked');
                this._markedModule = mod.marked ? mod.marked : mod;
                return this._markedModule;
            } catch(e) {
                console.warn('[Gemini Ultimate] Dynamic import (Method 2) failed:', e);
            }

            // Method 3: Script Injection / Polyfill via fetchResource and new Function
            try {
                const code = await fetchResource('https://cdn.jsdelivr.net/npm/marked/marked.min.js', 'GET', null, 'text');
                const p = getTrustedPolicy();
                const safeCode = p ? p.createScript(code + ';\nwindow.marked = marked;') : (code + ';\nwindow.marked = marked;');
                
                const script = document.createElement('script');
                // try to copy nonce to bypass strict CSP if possible
                const existingScript = document.querySelector('script[nonce]');
                if (existingScript) script.setAttribute('nonce', existingScript.getAttribute('nonce'));
                script.textContent = safeCode;
                document.head.appendChild(script);

                if (window.marked) {
                    this._markedModule = window.marked;
                    return window.marked;
                }
            } catch(e) {
                console.warn('[Gemini Ultimate] Fallback Script injection failed:', e);
            }

            throw new Error('Marked.js 載入失敗 (Content Security Policy 或網路阻擋)。你可以透過 @require 引入以解決此問題。');
        },
        /* 工業級 CSV 解析 (RFC 4180 相容) */
        parseCSV(text) {
            const result = [];
            let row = [], inQuotes = false, val = '';
            for (let i = 0; i < text.length; i++) {
                let c = text[i], next = text[i+1];
                if (c === '"' && inQuotes && next === '"') { val += '"'; i++; } // 雙引號跳脫
                else if (c === '"') { inQuotes = !inQuotes; }
                else if (c === ',' && !inQuotes) { row.push(val); val = ''; }
                else if (c === '\n' && !inQuotes) { row.push(val); result.push(row); row = []; val = ''; }
                else if (c !== '\r') { val += c; }
            }
            row.push(val); result.push(row);
            return result.filter(r => r.join('').trim() !== ''); // 過濾空行
        }
    };

    // ============================================
    // 資源獲取函數
    // ============================================
    function fetchResource(url, method = 'GET', data = null, responseType = 'text', retryCount = 0) {
        return new Promise((resolve, reject) => {
            const headers = {
                'User-Agent': CONFIG.USER_AGENT,
                'Accept': responseType === 'blob' ? 'image/*' : 'application/json, text/plain, */*',
                'Cache-Control': 'no-cache'
            };
            if (method === 'POST' && data) headers['Content-Type'] = 'text/plain;charset=UTF-8';

            GM_xmlhttpRequest({
                method, url, data, responseType, headers,
                timeout: CONFIG.REQUEST_TIMEOUT,
                anonymous: true,
                onload: res => {
                    if (res.status >= 200 && res.status < 300) {
                        resolve(responseType === 'blob' ? res.response : res.responseText);
                    } else {
                        reject(new Error(`HTTP ${res.status}`));
                    }
                },
                onerror: () => {
                    if (retryCount < CONFIG.MAX_RETRIES) {
                        setTimeout(() =>
                            fetchResource(url, method, data, responseType, retryCount + 1).then(resolve).catch(reject),
                            CONFIG.RETRY_DELAY * (retryCount + 1)
                        );
                    } else {
                        reject(new Error('網路錯誤'));
                    }
                },
                ontimeout: () => reject(new Error('請求超時'))
            });
        });
    }

    /* --- § 4. Mermaid Detection & Preprocessing --- */
    const MERMAID_KEYWORDS = [
        'C4Context','C4Container','classDiagram','erDiagram',
        'flowchart','gantt','gitGraph','graph','journey',
        'mindmap','pie','quadrantChart','requirementDiagram',
        'sequenceDiagram','stateDiagram','timeline','sankey','zenuml'
    ];
	// ============================================
    // Mermaid 邏輯檢測
    // ============================================
    function isMermaidCode(content) {
        const keywords = [
            'C4Context', 'C4Container', 'classDiagram', 'erDiagram',
            'flowchart', 'gantt', 'gitGraph', 'graph', 'journey',
            'mindmap', 'pie', 'quadrantChart', 'requirementDiagram',
            'sequenceDiagram', 'stateDiagram', 'timeline', 'sankey'
        ];
        const trimmed = content.trim();
        return keywords.some(k => trimmed.startsWith(k)) || trimmed.startsWith('%%{init:');
    }



    function preprocessMermaidCode(code) {
        let processedCode = code.trim();
        let fixes = [];

        if (processedCode.startsWith('gantt') && !processedCode.includes('dateFormat')) {
            const lines = processedCode.split('\n');
            lines.splice(1, 0, '    dateFormat YYYY-MM-DD');
            processedCode = lines.join('\n');
            fixes.push('添加 dateFormat');
        }

        return { code: processedCode, fixes };
    }

    /* --- § 5. Generate Interactive Mermaid HTML (srcdoc iframe + CSP Bypass) --- */

    // 全域快取：避免每次點擊都重新下載 1.5MB 的核心庫
    let _mermaidLibraryCache = null;

    async function ensureMermaidLibrary() {
        if (_mermaidLibraryCache) return _mermaidLibraryCache;
        for (const url of CONFIG.MERMAID_CDNS) {
            try {
                const code = await fetchResource(url, 'GET', null, 'text');
                if (code && code.includes('mermaid')) {
                    _mermaidLibraryCache = code;
                    return code;
                }
            } catch (e) {
                log('CDN fetch failed:', url, e);
            }
        }
        throw new Error('無法從任何 CDN 載入 Mermaid 核心庫 (請檢查網路規則)');
    }

    // ============================================
    // Mermaid 互動式 HTML (修復 iOS 版)
    // ============================================
    function createStandaloneMermaidHTML(mermaidCode, libCode) {
        const safeCode = JSON.stringify(mermaidCode);
        
        // 將核心庫轉為 inline script 避免 iOS Safari Blob iframe 的跨域存取阻擋
        const inlineLibHTML = libCode ? `<script>${libCode.replace(/<\/script>/gi, '<\\/script>')}</script>` : '';

        return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, maximum-scale=5.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; script-src 'unsafe-inline' 'unsafe-eval' https: data: blob:; style-src 'unsafe-inline' https:;">
    <title>互動式 Mermaid 圖表</title>
    ${inlineLibHTML}
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%);
            overflow: hidden;
            height: 100vh;
            width: 100vw;
            /* 📱 iOS 滾動核心修復 */
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: none;
        }
        #container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            cursor: grab;
            user-select: none;
        }
        #container.panning {
            cursor: grabbing;
        }
        #diagram-wrapper {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.3);
            overflow: visible;
            transform-origin: center center;
            transition: transform 0.08s ease-out;
            position: relative;
        }
        #diagram-wrapper svg {
            display: block;
            max-width: none !important;
            height: auto !important;
        }
        .zoom-controls {
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: rgba(255, 255, 255, 0.95);
            padding: 16px;
            border-radius: 18px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25), 0 1px 8px rgba(0,0,0,0.1);
            backdrop-filter: blur(16px);
        }
        .zoom-btn {
            width: 52px;
            height: 52px;
            border: none;
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            border-radius: 14px;
            cursor: pointer;
            font-size: 24px;
            font-weight: bold;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
            user-select: none;
        }
        .zoom-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
        }
        .zoom-btn:active {
            transform: scale(0.95) translateY(0);
        }
        .zoom-level {
            font-size: 14px;
            text-align: center;
            background: linear-gradient(135deg, #4F46E5, #7C3AED);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            padding: 10px 0;
            user-select: none;
        }
        .loading {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: white;
            z-index: 9999;
        }
        .loading-spinner {
            width: 60px;
            height: 60px;
            border: 6px solid rgba(255,255,255,0.2);
            border-top: 6px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .loading-text {
            font-size: 18px;
            font-weight: 600;
        }
        .error {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4);
            max-width: 90%;
            text-align: center;
            z-index: 9999;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .error-message {
            color: #DC2626;
            font-size: 14px;
            line-height: 1.6;
        }
        .help-text {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 13px;
            z-index: 999;
            animation: fadeIn 0.5s ease-in;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            user-select: none;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
    </style>
</head>
<body>
    <div class="loading" id="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在渲染圖表...</div>
    </div>

    <div id="container" style="display:none;">
        <div id="diagram-wrapper"></div>
    </div>

    <div class="zoom-controls" id="controls" style="display:none;">
        <button class="zoom-btn" id="zoom-in" title="放大">+</button>
        <div class="zoom-level" id="zoom-level">200%</div>
        <button class="zoom-btn" id="zoom-out" title="縮小">−</button>
        <button class="zoom-btn" id="zoom-reset" title="重置">⟲</button>
    </div>

    <div class="help-text" id="help" style="display:none;">
        📱 雙指縮放 | 🖱️ 滑鼠滾輪 | 🖐️ 拖曳平移 | 🔄 雙擊重置
    </div>

    <script>
        (function() {
            const mermaidCode = ${safeCode};

            let scale = 2; // 預設 200%
            let posX = 0;
            let posY = 0;
            let isPanning = false;
            let startX = 0;
            let startY = 0;
            let initialDistance = 0;

            const container = document.getElementById('container');
            const wrapper = document.getElementById('diagram-wrapper');
            const loading = document.getElementById('loading');
            const controls = document.getElementById('controls');
            const help = document.getElementById('help');
            const zoomLevel = document.getElementById('zoom-level');

            function showError(message) {
                loading.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error';
                errorDiv.innerHTML = '<div class="error-icon">❌</div><div class="error-message">' + message + '</div>';
                document.body.appendChild(errorDiv);

                try {
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ type: 'mermaid-error', message: message }, '*');
                    }
                } catch (e) {
                    console.error('無法通知父頁面:', e);
                }
            }

            function notifySuccess() {
                try {
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ type: 'mermaid-success' }, '*');
                    }
                } catch (e) {
                    console.error('無法通知父頁面:', e);
                }
            }

            const renderTimeout = setTimeout(function() {
                showError('渲染超時,請檢查 Mermaid 語法或網路連線');
            }, ${CONFIG.RENDER_TIMEOUT});

            const cdnList = ${JSON.stringify(CONFIG.MERMAID_CDNS)};
            let currentCdnIndex = 0;

            function loadMermaidCDN() {
                return new Promise(function(resolve, reject) {
                    if (typeof mermaid !== 'undefined') {
                        resolve();
                        return;
                    }
                    if (currentCdnIndex >= cdnList.length) {
                        reject(new Error('所有 CDN 載入失敗'));
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = cdnList[currentCdnIndex];
                    script.onload = function() {
                        console.log('Mermaid 載入成功:', cdnList[currentCdnIndex]);
                        resolve();
                    };
                    script.onerror = function() {
                        console.warn('CDN 失敗:', cdnList[currentCdnIndex]);
                        currentCdnIndex++;
                        loadMermaidCDN().then(resolve).catch(reject);
                    };
                    document.head.appendChild(script);
                });
            }

            function render() {
                loadMermaidCDN().then(function() {
                    if (typeof mermaid === 'undefined') {
                        throw new Error('Mermaid 庫載入失敗');
                    }

                    mermaid.initialize({
                        startOnLoad: false,
                        theme: 'default',
                        securityLevel: 'loose',
                        logLevel: 'error'
                    });

                    return mermaid.render('diagram', mermaidCode);
                }).then(function(result) {
                    clearTimeout(renderTimeout);

                    wrapper.innerHTML = result.svg;
                    loading.style.display = 'none';
                    container.style.display = 'flex';
                    controls.style.display = 'flex';
                    help.style.display = 'block';

                    updateTransform();
                    setupInteractions();
                    notifySuccess();
                }).catch(function(error) {
                    clearTimeout(renderTimeout);
                    console.error('渲染錯誤:', error);
                    showError('渲染失敗: ' + error.message);
                });
            }

            function updateTransform() {
                wrapper.style.transform = 'translate(' + posX + 'px, ' + posY + 'px) scale(' + scale + ')';
                zoomLevel.textContent = Math.round(scale * 100) + '%';
            }

            // 以滑鼠位置為中心的縮放（優化版）
            function zoom(delta, mouseX, mouseY) {
                const oldScale = scale;
                scale = Math.max(0.1, Math.min(10, scale + delta));

                if (mouseX !== undefined && mouseY !== undefined) {
                    const rect = container.getBoundingClientRect();
                    const offsetX = mouseX - rect.left;
                    const offsetY = mouseY - rect.top;

                    posX = offsetX - (offsetX - posX) * (scale / oldScale);
                    posY = offsetY - (offsetY - posY) * (scale / oldScale);
                } else {
                    const centerX = container.offsetWidth / 2;
                    const centerY = container.offsetHeight / 2;
                    posX = centerX - (centerX - posX) * (scale / oldScale);
                    posY = centerY - (centerY - posY) * (scale / oldScale);
                }

                updateTransform();
            }

            function reset() {
                scale = 2; // 重置為 200%
                posX = 0;
                posY = 0;
                updateTransform();
            }

            function setupInteractions() {
                document.getElementById('zoom-in').addEventListener('click', function() {
                    zoom(0.2);
                });
                document.getElementById('zoom-out').addEventListener('click', function() {
                    zoom(-0.2);
                });
                document.getElementById('zoom-reset').addEventListener('click', reset);

                // 觸控事件
                container.addEventListener('touchstart', function(e) {
                    if (e.touches.length === 1) {
                        isPanning = true;
                        startX = e.touches[0].clientX - posX;
                        startY = e.touches[0].clientY - posY;
                    } else if (e.touches.length === 2) {
                        const dx = e.touches[0].clientX - e.touches[1].clientX;
                        const dy = e.touches[0].clientY - e.touches[1].clientY;
                        initialDistance = Math.sqrt(dx * dx + dy * dy);
                    }
                });

                container.addEventListener('touchmove', function(e) {
                    e.preventDefault();
                    if (e.touches.length === 1 && isPanning) {
                        posX = e.touches[0].clientX - startX;
                        posY = e.touches[0].clientY - startY;
                        updateTransform();
                    } else if (e.touches.length === 2) {
                        const dx = e.touches[0].clientX - e.touches[1].clientX;
                        const dy = e.touches[0].clientY - e.touches[1].clientY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const delta = (distance - initialDistance) * 0.01;

                        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                        zoom(delta, centerX, centerY);
                        initialDistance = distance;
                    }
                }, { passive: false });

                container.addEventListener('touchend', function() {
                    isPanning = false;
                });

                // 滑鼠事件
                container.addEventListener('mousedown', function(e) {
                    isPanning = true;
                    startX = e.clientX - posX;
                    startY = e.clientY - posY;
                    container.classList.add('panning');
                    e.preventDefault();
                });

                document.addEventListener('mousemove', function(e) {
                    if (isPanning) {
                        posX = e.clientX - startX;
                        posY = e.clientY - startY;
                        updateTransform();
                    }
                });

                document.addEventListener('mouseup', function() {
                    isPanning = false;
                    container.classList.remove('panning');
                });

                container.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.15 : 0.15;
                    zoom(delta, e.clientX, e.clientY);
                }, { passive: false });

                container.addEventListener('dblclick', reset);
                container.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                });
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', render);
            } else {
                render();
            }
        })();
    </script>
</body>
</html>`;
    }

    /* --- § 渲染策略管線 (Renderer Pipeline) --- */
    const RendererStrategy = {
        async html(content, container) {
            // 沿用你原有的 iframe srcdoc/blob 邏輯
            const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
            return URL.createObjectURL(blob);
        },
        async mermaid(content, container) {
            // 由於 iOS Safari 對 Blob iframe 的網路存取有嚴格限制，預先下載 Mermaid 核心程式碼
            let libCode = '';
            try {
                libCode = await ensureMermaidLibrary();
            } catch (e) {
                console.warn('[Gemini Ultimate] ensureMermaidLibrary failed:', e);
            }
            const { code } = preprocessMermaidCode(content);
            const html = createStandaloneMermaidHTML(code, libCode);
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            return URL.createObjectURL(blob);
        },
        async markdown(content, container, previewDiv) {
            const marked = await DependencyManager.loadMarked();
            const p = getTrustedPolicy();
            const rawHtml = marked.parse(content);
            previewDiv.innerHTML = p ? p.createHTML(rawHtml) : rawHtml;
            // 觸發表格掃描以套用 UI 優化
            if (typeof TableOptimizer !== 'undefined') TableOptimizer.scanTables();
            return 'INLINE';
        },
        async csv(content, container, previewDiv) {
            const rows = DependencyManager.parseCSV(content);
            if (rows.length === 0) throw new Error('CSV 為空');
            
            let tableHtml = '<div class="table-block new-table-style"><table>';
            rows.forEach((row, index) => {
                tableHtml += '<tr>';
                row.forEach(cell => {
                    const tag = index === 0 ? 'th' : 'td'; // 第一行當作表頭
                    // 簡易 XSS 防護
                    const safeCell = cell.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    tableHtml += `<${tag}>${safeCell}</${tag}>`;
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</table></div>';

            const p = getTrustedPolicy();
            previewDiv.innerHTML = p ? p.createHTML(tableHtml) : tableHtml;
            if (typeof TableOptimizer !== 'undefined') TableOptimizer.scanTables();
            return 'INLINE';
        }
    };

    /* === DEPRECATED ===
    // ============================================
    // Mermaid 渲染主函數 (🔥 核心修復)
    // ============================================
    async function renderMermaidInteractive(content, codeBlockContainer) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'gemini-preview-container';

        const controls = document.createElement('div');
        controls.className = 'gemini-preview-controls';

        const statusContainer = document.createElement('div');
        statusContainer.className = 'gemini-preview-overlay';
        safeSetHTML(statusContainer, '<span class="gemini-loading-spinner"></span><span>創建互動圖表...</span>');

        if (CONFIG.IS_IOS) {
            const badge = document.createElement('span');
            badge.className = 'gemini-ios-badge';
            badge.textContent = '📱 iOS 優化';
            statusContainer.appendChild(badge);
        }

        const openInTabBtn = document.createElement('button');
        openInTabBtn.className = 'gemini-control-button';
        openInTabBtn.innerHTML = '🚀 全螢幕';
        openInTabBtn.disabled = true;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'gemini-control-button';
        downloadBtn.innerHTML = '💾 下載';
        downloadBtn.disabled = true;

        controls.appendChild(statusContainer);
        controls.appendChild(openInTabBtn);
        controls.appendChild(downloadBtn);

        const iframe = document.createElement('iframe');
        iframe.className = 'gemini-preview-iframe';
        iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-modals');

        previewContainer.appendChild(controls);
        previewContainer.appendChild(iframe);
        codeBlockContainer.parentNode.insertBefore(previewContainer, codeBlockContainer.nextSibling);

        try {
            const { code, fixes } = preprocessMermaidCode(content);
            const html = createStandaloneMermaidHTML(code);

            // 🔥 核心修正: 使用 Blob URL 替代 srcdoc
            // 這能強制瀏覽器將 iframe 視為獨立來源, 繞過 Safari 的嚴格 CSP 繼承
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            previewContainer.dataset.blobUrl = blobUrl;

            let renderSuccess = false;

            const messageHandler = (event) => {
                // 注意: 由於使用 blob URL，origin 可能為 null 或不確定，這裡放寬檢查
                if (event.data.type === 'mermaid-success') {
                    renderSuccess = true;
                    clearTimeout(checkTimeout);

                    let status = '<span class="gemini-preview-success">✅ 圖表已就緒（預設 200%）</span>';
                    if (fixes.length > 0) {
                        status += ` <small style="color: rgba(255,255,255,0.8);">(修正 ${fixes.length} 項)</small>`;
                    }
                    safeSetHTML(statusContainer, status);
                    window.removeEventListener('message', messageHandler);
                } else if (event.data.type === 'mermaid-error') {
                    renderSuccess = false;
                    clearTimeout(checkTimeout);
                    safeSetHTML(statusContainer, `<span style="color: #fff;">❌ ${event.data.message}</span>`);
                    window.removeEventListener('message', messageHandler);
                }
            };

            window.addEventListener('message', messageHandler);

            const checkTimeout = setTimeout(() => {
                if (!renderSuccess) {
                    safeSetHTML(statusContainer, '<span style="color: #fff;">⏳ 渲染中... (如果卡住請嘗試全螢幕)</span>');
                    // 這裡不移除監聽器，給予更多時間
                }
            }, CONFIG.RENDER_TIMEOUT);

            // 設置 src 觸發加載
            iframe.src = blobUrl;

            openInTabBtn.onclick = () => {
                GM_openInTab(blobUrl, { active: true });
            };
            openInTabBtn.disabled = false;

            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `mermaid-diagram-${Date.now()}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
            downloadBtn.disabled = false;

        } catch (error) {
            console.error('Mermaid 設置失敗:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'gemini-preview-error';
            errorDiv.textContent = `❌ 渲染失敗\n\n錯誤: ${error.message}`;
            previewContainer.appendChild(errorDiv);
        }
    }

    // ============================================
    // HTML 渲染
    // ============================================
    async function renderHTML(content, codeBlockContainer) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'gemini-preview-container';

        const controls = document.createElement('div');
        controls.className = 'gemini-preview-controls';

        const statusContainer = document.createElement('div');
        statusContainer.className = 'gemini-preview-overlay';
        safeSetHTML(statusContainer, '<span class="gemini-loading-spinner"></span><span>渲染中...</span>');

        const openBtn = document.createElement('button');
        openBtn.className = 'gemini-control-button';
        openBtn.textContent = '🚀 新分頁';

        controls.appendChild(statusContainer);
        controls.appendChild(openBtn);

        const iframe = document.createElement('iframe');
        iframe.className = 'gemini-preview-iframe';
        iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');

        previewContainer.appendChild(controls);
        previewContainer.appendChild(iframe);
        codeBlockContainer.parentNode.insertBefore(previewContainer, codeBlockContainer.nextSibling);

        const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        previewContainer.dataset.blobUrl = url;

        iframe.onload = () => {
            safeSetHTML(statusContainer, '<span class="gemini-preview-success">✅ 渲染成功</span>');
        };

        iframe.src = url;
        openBtn.onclick = () => GM_openInTab(url, { active: true });
    }
    === END DEPRECATED === */

    // ============================================
    // Pollinations 圖片
    // ============================================
    async function renderPollinationsLink(node) {
        if (node.tagName !== 'A' || !node.href || node.dataset.rendered) return;

        let imageUrl = null;
        if (node.href.startsWith('https://image.pollinations.ai/prompt/')) {
            imageUrl = node.href;
        } else if (node.href.includes('google.com/search?q=https://image.pollinations.ai/prompt/')) {
            imageUrl = new URL(node.href).searchParams.get('q');
        }

        if (!imageUrl) return;

        node.dataset.rendered = 'true';
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'padding: 16px; border: 2px dashed #4F46E5; display: inline-block; border-radius: 12px; background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);';
        safeSetHTML(placeholder, '<span class="gemini-loading-spinner"></span>載入圖片...');
        node.parentNode.replaceChild(placeholder, node);

        try {
            const imageBlob = await fetchResource(imageUrl, 'GET', null, 'blob');
            const img = document.createElement('img');
            img.src = URL.createObjectURL(imageBlob);
            img.alt = 'AI 圖片';
            img.style.cssText = 'max-width: 100%; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);';
            img.onload = () => placeholder.parentNode.replaceChild(img, placeholder);
        } catch (error) {
            placeholder.textContent = `❌ 載入失敗: ${error.message}`;
            placeholder.style.color = '#DC2626';
        }
    }

    /* --- § 視圖控制器與按鈕注入 --- */
    function injectSmartRenderButton(codeBlockContainer) {
        if (codeBlockContainer.dataset.smartRenderAdded === 'true') return;

        const codeElement = codeBlockContainer.querySelector('pre > code, code');
        if (!codeElement) return;

        const content = (codeElement.textContent || '').trim();
        if (!content) return;

        let lang = '';
        const decoration = codeBlockContainer.querySelector('.code-block-decoration span');
        if (decoration) lang = decoration.textContent.trim().toLowerCase();

        // 判定支援的渲染類型
        let type = null;
        let btnConfig = { text: '', class: '', icon: '' };

        if (lang === 'html' || content.startsWith('<!DOCTYPE')) { type = 'html'; btnConfig = {text: '渲染網頁', class: '', icon: '▶️'}; }
        else if (lang === 'mermaid' || isMermaidCode(content)) { type = 'mermaid'; btnConfig = {text: '互動圖表', class: 'gemini-mermaid-button', icon: '🎨'}; }
        else if (lang === 'markdown' || lang === 'md') { type = 'markdown'; btnConfig = {text: 'MD 預覽', class: 'gemini-md-button', icon: '📝'}; }
        else if (lang === 'csv') { type = 'csv'; btnConfig = {text: '資料表', class: 'gemini-csv-button', icon: '📊'}; }

        if (!type) return;

        // 建立 View Container 包裹原有的 pre
        const preEl = codeElement.closest('pre');
        if (!preEl || preEl.tagName !== 'PRE') return;
        
        if (!preEl.parentElement.classList.contains('tm-view-container')) {
            const viewContainer = document.createElement('div');
            viewContainer.className = 'tm-view-container';
            preEl.parentNode.insertBefore(viewContainer, preEl);
            viewContainer.appendChild(preEl);
            preEl.classList.add('tm-raw-view');
            
            const previewDiv = document.createElement('div');
            previewDiv.className = 'tm-preview-view markdown-renderer'; // 套用 markdown 樣式
            viewContainer.appendChild(previewDiv);
            
            viewContainer.dataset.previewDivId = 'true';
        }

        const viewContainer = preEl.closest('.tm-view-container');
        const previewDiv = viewContainer.querySelector('.tm-preview-view');

        const button = document.createElement('button');
        button.className = `gemini-render-button ${btnConfig.class}`;
        button.innerHTML = `${btnConfig.icon} ${btnConfig.text}`;
        button.dataset.mode = 'raw';

        button.onclick = async (e) => {
            e.stopPropagation(); e.preventDefault();
            const isRaw = button.dataset.mode === 'raw';

            if (isRaw) {
                // 切換至預覽模式
                button.disabled = true;
                button.innerHTML = '⏳ 處理中...';
                try {
                    const result = await RendererStrategy[type](content, codeBlockContainer, previewDiv);
                    
                    if (result === 'INLINE') {
                        // Markdown 或 CSV：隱藏代碼，顯示內聯 Markdown/CSV 預覽
                        viewContainer.classList.add('tm-state-inline-preview');
                        button.innerHTML = `💻 查看原始碼`;
                    } else {
                        // HTML 或 Mermaid：隱藏代碼，隱藏內聯預覽，加入 Iframe 組件
                        viewContainer.classList.add('tm-state-iframe-preview');
                        
                        const previewContainer = document.createElement('div');
                        previewContainer.className = 'gemini-preview-container';

                        const controls = document.createElement('div');
                        controls.className = 'gemini-preview-controls';

                        const statusContainer = document.createElement('div');
                        statusContainer.className = 'gemini-preview-overlay';
                        
                        const openInTabBtn = document.createElement('button');
                        openInTabBtn.className = 'gemini-control-button';
                        openInTabBtn.innerHTML = '🚀 全螢幕';

                        controls.appendChild(statusContainer);
                        controls.appendChild(openInTabBtn);

                        const iframe = document.createElement('iframe');
                        iframe.className = 'gemini-preview-iframe';
                        iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-modals');

                        previewContainer.appendChild(controls);
                        previewContainer.appendChild(iframe);
                        viewContainer.appendChild(previewContainer);

                        iframe.src = result; // result is blobUrl
                        
                        openInTabBtn.onclick = () => {
                            GM_openInTab(result, { active: true });
                        };

                        statusContainer.innerHTML = '<span class="gemini-preview-success">✅ 渲染完成</span>';
                        previewDiv.dataset.blobUrl = result;
                        
                        button.innerHTML = `❌ 關閉預覽`;
                    }
                    button.dataset.mode = 'preview';
                } catch (error) {
                    console.error('渲染失敗:', error);
                    Utils.showToast(`❌ 渲染失敗: ${error.message}`);
                    button.innerHTML = `${btnConfig.icon} ${btnConfig.text}`;
                }
                button.disabled = false;
            } else {
                // 切換回原始碼模式
                viewContainer.classList.remove('tm-state-inline-preview', 'tm-state-iframe-preview');
                button.dataset.mode = 'raw';
                button.innerHTML = `${btnConfig.icon} ${btnConfig.text}`;
                
                // 清理 Blob 記憶體
                if (previewDiv.dataset.blobUrl) {
                    URL.revokeObjectURL(previewDiv.dataset.blobUrl);
                    delete previewDiv.dataset.blobUrl;
                }
                previewDiv.innerHTML = ''; 
                const iframePreview = viewContainer.querySelector('.gemini-preview-container');
                if (iframePreview) iframePreview.remove();
            }
        };

        const buttonsDiv = codeBlockContainer.querySelector('.code-block-decoration .buttons');
        if (buttonsDiv) {
            buttonsDiv.insertBefore(button, buttonsDiv.firstChild);
            codeBlockContainer.dataset.smartRenderAdded = 'true';
        }
    }

    /* === DEPRECATED ===
    // ============================================
    // 添加渲染按鈕
    // ============================================
    function addRenderButton(codeBlockContainer) {
        if (codeBlockContainer.dataset.renderButtonAdded === 'true') return;

        const codeElement = codeBlockContainer.querySelector('pre > code, code');
        if (!codeElement) return;

        const content = codeElement.textContent || '';
        if (!content.trim()) return;

        let lang = '';
        const decoration = codeBlockContainer.querySelector('.code-block-decoration span');
        if (decoration) lang = decoration.textContent.trim().toLowerCase();

        const isHtml = lang === 'html' || content.includes('<!DOCTYPE');
        const isMermaid = lang === 'mermaid' || isMermaidCode(content);

        if (!isHtml && !isMermaid) return;

        const button = document.createElement('button');
		button.style.paddingRight = '15%';
        button.className = 'gemini-render-button';

        if (isMermaid) {
            button.innerHTML = '🎨 互動圖表';
            button.classList.add('gemini-mermaid-button');
        } else {
            button.innerHTML = '▶️ 渲染';
        }

        button.onclick = async (e) => {
            e.stopPropagation();
            e.preventDefault();

            const existing = codeBlockContainer.nextElementSibling;
            if (existing?.classList.contains('gemini-preview-container')) {
                // 清理 Blob URL 避免內存洩漏
                if (existing.dataset.blobUrl) {
                    URL.revokeObjectURL(existing.dataset.blobUrl);
                }
                existing.remove();
                button.innerHTML = isMermaid ? '🎨 互動圖表' : '▶️ 渲染';
                button.disabled = false;
            } else {
                button.disabled = true;
                button.innerHTML = '⏳ 處理中...';
                try {
                    if (isMermaid) {
                        await renderMermaidInteractive(content, codeBlockContainer);
                    } else {
                        await renderHTML(content, codeBlockContainer);
                    }
                    button.innerHTML = '❌ 關閉';
                    button.disabled = false;
                } catch (error) {
                    console.error('錯誤:', error);
                    button.innerHTML = isMermaid ? '🎨 互動圖表' : '▶️ 渲染';
                    button.disabled = false;
                }
            }
        };

        const buttonsDiv = codeBlockContainer.querySelector('.code-block-decoration .buttons');
        if (buttonsDiv) {
            buttonsDiv.insertBefore(button, buttonsDiv.firstChild);
            codeBlockContainer.dataset.renderButtonAdded = 'true';
        }
    }
    === END DEPRECATED === */
    /* --- § 10. Core Utilities --- */
    const ATTR_PROCESSED           = 'data-tm-processed';
    const ATTR_CONTAINER_PROCESSED = 'data-tm-container-processed';

    const Utils = {
        /* Toast 通知 */
        showToast(msg, duration = 2500) {
            if (CONFIG.IS_TOUCH && window.navigator.vibrate) window.navigator.vibrate(10);
            const el = document.createElement('div');
            el.className = 'tm-ml-toast';
            el.innerHTML = `<strong>Gemini v5.0</strong>${msg}`;
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('tm-show'));
            setTimeout(() => { el.classList.remove('tm-show'); setTimeout(() => el.remove(), 300); }, duration);
        },

        /* Base64 URL 安全編碼（用於 mermaid.live） */
        base64UrlEncode(str) {
            try {
                return btoa(unescape(encodeURIComponent(str)))
                    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            } catch (e) { log('Base64 encode error:', e); return null; }
        },

        /* 取得代碼文字 */
        getCodeText(block) {
            const el = block.tagName === 'CODE' ? block : (block.querySelector('code') || block);
            return (el.innerText || el.textContent || '').trim();
        },

        /* 向上查找複製按鈕所在容器（Chrome/Firefox 兼容） */
        getTargetContainer(codeEl) {
            let parent = codeEl.parentElement;
            for (let i = 0; i < 8; i++) {
                if (!parent) break;
                if (parent.hasAttribute(ATTR_CONTAINER_PROCESSED)) {
                    log('Container already processed, skip');
                    return null;
                }
                const btns = parent.querySelectorAll('button, [role="button"], a[role="button"]');
                const copyBtn = Array.from(btns).find(b => {
                    const aria  = b.getAttribute('aria-label') || b.ariaLabel || '';
                    const text  = (b.innerText || b.textContent || '').toLowerCase();
                    const title = b.getAttribute('title') || '';
                    return ['copy','複製','复制','コピー','copier','kopieren'].some(k =>
                        aria.toLowerCase().includes(k) || text.includes(k) || title.toLowerCase().includes(k)
                    );
                });
                if (copyBtn) {
                    log('Copy button found');
                    const container = copyBtn.parentElement;
                    container.setAttribute(ATTR_CONTAINER_PROCESSED, 'true');
                    return { container, ref: copyBtn };
                }
                parent = parent.parentElement;
            }
            log('Copy button not found → fallback overlay');
            return { needFallback: true };
        },

        /* Debounce */
        debounce(func, wait) {
            let timer;
            return (...args) => { clearTimeout(timer); timer = setTimeout(() => func(...args), wait); };
        },

        /* Chrome 強制 reflow */
        forceReflow(el) { if (CONFIG.IS_CHROME) void el.offsetHeight; }
    };

    /* --- § 11. UI Components (Mermaid Live, Folding) --- */
    const Components = {
        /* 通用按鈕工廠 */
        createButton(cls, iconSvg, text, onClick) {
            const btn = document.createElement('button');
            btn.className = `tm-action-btn ${cls}`;
            btn.type = 'button';
            btn.setAttribute('role', 'button');
            btn.setAttribute('aria-label', text);
            btn.innerHTML = `${iconSvg}<span class="tm-btn-text-full">${text}</span>`;

            const handler = (e) => {
                e.preventDefault(); e.stopPropagation();
                if (btn.classList.contains('tm-loading')) return;
                log(`Button clicked: ${text}`);
                onClick(btn, e);
            };
            if (CONFIG.IS_TOUCH) btn.addEventListener('touchend', handler, { passive: false });
            btn.addEventListener('click', handler, false);
            if (CONFIG.IS_CHROME) requestAnimationFrame(() => Utils.forceReflow(btn));
            return btn;
        },

        /* Mermaid Live 按鈕（開啟 mermaid.live 編輯器） */
        createMermaidLiveBtn(codeEl) {
            return Components.createButton(
                'tm-btn-mermaid',
                '<svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-7h-2v7z"/></svg>',
                'Mermaid Live',
                (btn) => {
                    btn.classList.add('tm-loading');
                    try {
                        const code    = Utils.getCodeText(codeEl);
                        const payload = {
                            code,
                            mermaid: {
                                theme: 'dark',
                                themeVariables: {
                                    darkMode: true, background: '#1E1E1E',
                                    primaryColor: '#4EC9B0', primaryTextColor: '#D4D4D4',
                                    primaryBorderColor: '#3E3E42', lineColor: '#9CDCFE',
                                    secondaryColor: '#569CD6', tertiaryColor: '#C586C0'
                                }
                            }
                        };
                        const encoded = Utils.base64UrlEncode(JSON.stringify(payload));
                        if (encoded) {
                            window.open(`https://mermaid.live/edit#base64:${encoded}`, '_blank');
                            Utils.showToast('✓ Mermaid Live 已開啟');
                        } else throw new Error('編碼失敗');
                    } catch (e) {
                        Utils.showToast('❌ 錯誤: ' + e.message);
                        log('Mermaid Live error:', e);
                    } finally {
                        setTimeout(() => btn.classList.remove('tm-loading'), 500);
                    }
                }
            );
        },

        /* 折疊按鈕（超過 FOLD_THRESHOLD 行時出現） */
        createFoldBtn(preElement) {
            const iconCollapse = '<svg viewBox="0 0 24 24"><path d="M12 8l-6 6 1.41 1.41L12 10.83l5.59 5.58L19 14z"/></svg>';
            const iconExpand   = '<svg viewBox="0 0 24 24"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>';
            let isCollapsed = true;

            const updateState = (btn) => {
                if (isCollapsed) {
                    preElement.classList.add('tm-code-container-collapsed');
                    preElement.classList.remove('tm-code-container-expanded');
                    btn.classList.remove('is-expanded');
                    btn.innerHTML = `${iconExpand}<span class="tm-btn-text-full">展開代碼</span>`;
                    btn.setAttribute('aria-label', '展開代碼');
                    preElement.scrollTop = 0;
                } else {
                    preElement.classList.remove('tm-code-container-collapsed');
                    preElement.classList.add('tm-code-container-expanded');
                    btn.classList.add('is-expanded');
                    btn.innerHTML = `${iconCollapse}<span class="tm-btn-text-full">收起代碼</span>`;
                    btn.setAttribute('aria-label', '收起代碼');
                }
                Utils.forceReflow(preElement);
            };

            const btn = Components.createButton('tm-btn-fold', iconExpand, '展開代碼', (btnEl) => {
                isCollapsed = !isCollapsed;
                updateState(btnEl);
            });
            updateState(btn);
            return btn;
        }
    };

    /* --- § 12. Code Block Processor & DOM Scanning --- */
    const Processor = {
        processBlock(codeEl, retryCount = 0) {
            try {
                if (codeEl.hasAttribute(ATTR_PROCESSED)) return;

                const codeText  = Utils.getCodeText(codeEl);
                if (!codeText || codeText.length < 3) return;

                const lineCount  = codeText.split('\n').length;
                const isMermaid  = isMermaidCode(codeText);
                const shouldFold = lineCount > CONFIG.FOLD_THRESHOLD;

                log(`processBlock: ${lineCount} lines, mermaid=${isMermaid}, fold=${shouldFold}`);

                if (!isMermaid && !shouldFold) {
                    codeEl.setAttribute(ATTR_PROCESSED, 'true');
                    return;
                }

                const target = Utils.getTargetContainer(codeEl);
                /* ── 工業級修正 v5.1 ──────────────────────────────────────────
                   所有自訂按鈕統一掛到 pre 的父層 overlay，
                   完全解耦 Gemini 原生按鈕列，零侵入、零裁切。
                   ─────────────────────────────────────────────────────────── */
                const preEl  = codeEl.closest('pre') || codeEl.parentElement;
                const wrapEl = preEl?.parentElement  || preEl;

                if (!wrapEl || !wrapEl.isConnected) {
                    if (retryCount < CONFIG.MAX_RETRIES && CONFIG.IS_CHROME) {
                        log(`⏳ Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES}…`);
                        setTimeout(() => Processor.processBlock(codeEl, retryCount + 1),
                                   CONFIG.RETRY_DELAY * (retryCount + 1));
                        return;
                    }
                    codeEl.setAttribute(ATTR_PROCESSED, 'true');
                    return;
                }

                if (getComputedStyle(wrapEl).position === 'static') wrapEl.style.position = 'relative';

                let overlay = wrapEl.querySelector(':scope > .tm-overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'tm-overlay';
                    overlay.style.paddingRight = isMermaid && !overlay.querySelector('.tm-btn-mermaid')?'10%':'2.5%';
                    overlay.setAttribute(ATTR_CONTAINER_PROCESSED, 'true');
                    overlay.setAttribute('role', 'group');
                    overlay.setAttribute('aria-label', '代碼操作按鈕');
                    wrapEl.appendChild(overlay);
                    Utils.forceReflow(overlay);
                }

                /* Mermaid Live 按鈕 */
                if (isMermaid && !overlay.querySelector('.tm-btn-mermaid')) {
                    const mmBtn = Components.createMermaidLiveBtn(codeEl);
                    overlay.appendChild(mmBtn);
                    Utils.forceReflow(mmBtn);
                    requestAnimationFrame(() => log(mmBtn.isConnected ? '✅ Mermaid Live btn added' : '❌ Mermaid Live btn missing'));
                }

                /* 折疊按鈕 */
                if (shouldFold && preEl && !overlay.querySelector('.tm-btn-fold')) {
                    const foldBtn = Components.createFoldBtn(preEl);
                    overlay.appendChild(foldBtn);
                    Utils.forceReflow(foldBtn);
                }

                codeEl.setAttribute(ATTR_PROCESSED, 'true');
                log('✅ Block processing done');
            } catch (err) {
                log('❌ processBlock error:', err);
                console.error('[Gemini v5.0] processBlock error:', err);
            }
        },

        scan() {
            try {
                const seen  = new Set();
                const nodes = [];
                const add   = (n) => { if (!seen.has(n)) { seen.add(n); nodes.push(n); } };

                /* 標準 DOM */
                document.body.querySelectorAll('code, pre').forEach(add);

                /* Shadow DOM */
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
                while (walker.nextNode()) {
                    if (walker.currentNode.shadowRoot)
                        walker.currentNode.shadowRoot.querySelectorAll('code, pre').forEach(add);
                }

                log(`🔍 Scanning ${nodes.length} code blocks…`);

                /* Chrome 批次處理 */
                if (CONFIG.IS_CHROME && nodes.length > 10) {
                    const bSize = 5;
                    for (let i = 0; i < nodes.length; i += bSize) {
                        const batch = nodes.slice(i, i + bSize);
                        setTimeout(() => batch.forEach(Processor.processBlock), i * 10);
                    }
                } else {
                    nodes.forEach(Processor.processBlock);
                }

                /* A 系統：掃描 code-block 容器（互動渲染按鈕） */
                document.querySelectorAll('div.code-block').forEach(injectSmartRenderButton);

                /* A 系統：掃描 Pollinations 連結 */
                document.querySelectorAll('a[href*="image.pollinations.ai"]').forEach(renderPollinationsLink);

                TableOptimizer.scanTables();

                log('✅ Scan done');
            } catch (err) {
                log('❌ scan error:', err);
                console.error('[Gemini v5.0] scan error:', err);
            }
        }
    };

    /* --- § 12.5 Table Optimizer (表格微互動與操作增強) --- */
    const TableOptimizer = {
        tableProcessedAttr: 'data-tm-table-processed',

        exportToCSV(tableEl) {
            let csv = [];
            const rows = tableEl.querySelectorAll('tr');
            for (let i = 0; i < rows.length; i++) {
                let row = [], cols = rows[i].querySelectorAll('td, th');
                for (let j = 0; j < cols.length; j++) {
                    let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ');
                    data = data.replace(/"/g, '""'); // 逸出雙引號
                    row.push('"' + data + '"');
                }
                csv.push(row.join(','));
            }
            const csvFile = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv.join('\n')], {type: 'text/csv;charset=utf-8;'});
            const downloadLink = document.createElement('a');
            downloadLink.download = `gemini_table_export_${Date.now()}.csv`;
            downloadLink.href = window.URL.createObjectURL(csvFile);
            downloadLink.style.display = 'none';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        },

        copyTableText(tableEl) {
            try {
                let csv = [];
                const rows = tableEl.querySelectorAll('tr');
                for (const row of rows) {
                    const cols = row.querySelectorAll('td, th');
                    const rowData = [];
                    for (const col of cols) {
                        let data = (col.innerText || col.textContent || '').trim();
                        data = data.replace(/"/g, '""'); // Escape double quotes
                        // Only wrap in quotes if necessary or just wrap all for safety
                        rowData.push(`"${data}"`);
                    }
                    csv.push(rowData.join(','));
                }
                const csvString = csv.join('\n');
                
                // 行動端優先嘗試使用 navigator.clipboard 解決 GM_setClipboard 可能的失效問題
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(csvString).then(() => {
                        Utils.showToast('📋 表格已複製 (逗點分隔)');
                    }).catch(() => {
                        GM_setClipboard(csvString, 'text');
                        Utils.showToast('📋 表格已複製 (逗點分隔)');
                    });
                } else {
                    GM_setClipboard(csvString, 'text');
                    Utils.showToast('📋 表格已複製 (逗點分隔)');
                }
            } catch (err) {
                console.error('[Gemini Ultimate] Copy Table Error:', err);
                // Fallback
                GM_setClipboard(tableEl.innerText, 'text');
                Utils.showToast('📋 表格內容已複製');
            }
        },

        processTable(tableContainer) {
            if (tableContainer.hasAttribute(this.tableProcessedAttr)) return;
            
            const table = tableContainer.querySelector('table');
            if (!table) return;

            // 確保父容器為 relative 以放置絕對定位的工具列
            if (getComputedStyle(tableContainer).position === 'static') {
                tableContainer.style.position = 'relative';
            }

            const toolbar = document.createElement('div');
            toolbar.className = 'tm-table-toolbar';

            // 建立複製按鈕
            const copyBtn = Components.createButton('tm-btn-fold', '📋', '複製內容', () => this.copyTableText(table));
            copyBtn.classList.replace('tm-btn-fold', 'tm-btn-mermaid'); // 借用你既有的樣式
            
            // 建立匯出按鈕
            const exportBtn = Components.createButton('tm-btn-fold', '📥', '匯出 CSV', () => this.exportToCSV(table));

            toolbar.appendChild(copyBtn);
            toolbar.appendChild(exportBtn);
            tableContainer.appendChild(toolbar);

            tableContainer.setAttribute(this.tableProcessedAttr, 'true');
        },

        scanTables() {
            try {
                // 精確尋找所有表格元素並進行包裹，避免在手機端將整個對話容器判斷為表格
                document.querySelectorAll('.model-response-text table, .tm-preview-view table, .markdown-renderer table, .table-block table').forEach(table => {
                    let container = table.closest('.tm-table-wrapper') || table.closest('.table-block');
                    if (!container) {
                        const parent = table.parentElement;
                        // 如果它被放在一個單純為了包裝 table 的 div 裡 (例如 gemini 的預設)，可以直接加 class
                        // 並且避免它是 .model-response-text 或 .markdown-renderer 母容器
                        if (parent && parent.tagName === 'DIV' && 
                            !parent.classList.contains('model-response-text') && 
                            !parent.classList.contains('markdown-renderer') && 
                            parent.children.length === 1) {
                            parent.classList.add('tm-table-wrapper');
                            container = parent;
                        } else {
                            // 否則自行建立容器包裹
                            container = document.createElement('div');
                            container.className = 'tm-table-wrapper';
                            table.parentNode.insertBefore(container, table);
                            container.appendChild(table);
                        }
                    }
                    this.processTable(container);
                });
            } catch (e) {
                console.warn('[Gemini Ultimate] scanTables error', e);
            }
        }
    };

    /* --- § 13. Initialization & MutationObserver --- */
    function init() {
        const browserInfo = CONFIG.IS_IOS ? 'iOS Safari' : CONFIG.IS_CHROME ? 'Chrome' : CONFIG.IS_FIREFOX ? 'Firefox' : 'Unknown';
        log(`🚀 Initializing Gemini Unified v5.0 on ${browserInfo}…`);

        /* 初始掃描 */
        Processor.scan();

        const debouncedScan = Utils.debounce(Processor.scan, CONFIG.DEBOUNCE_MS);

        /* 統一 MutationObserver */
        const observer = new MutationObserver((mutations) => {
            let hasChanges = false;
            for (const mutation of mutations) {
                if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;
                hasChanges = true;
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    /* A：code-block 容器 */
                    if (node.matches && node.matches('div.code-block')) injectSmartRenderButton(node);
                    if (node.querySelectorAll) node.querySelectorAll('div.code-block').forEach(injectSmartRenderButton);
                    /* A：Pollinations 連結 */
                    if (node.matches && node.matches('a[href*="image.pollinations.ai"]')) renderPollinationsLink(node);
                    if (node.querySelectorAll) node.querySelectorAll('a[href*="image.pollinations.ai"]').forEach(renderPollinationsLink);
                }
            }
            if (hasChanges) {
                log('DOM changed → debounced scan');
                debouncedScan();
            }
        });

        observer.observe(document.body, {
            childList:     true,
            subtree:       true,
            attributes:    false,
            characterData: false
        });

        /* Alt+M 快捷鍵：選取文字直接送 mermaid.live */
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.code === 'KeyM') {
                e.preventDefault();
                const sel = window.getSelection().toString();
                if (isMermaidCode(sel)) {
                    const encoded = Utils.base64UrlEncode(JSON.stringify({ code: sel, mermaid: { theme: 'dark' } }));
                    if (encoded) {
                        window.open(`https://mermaid.live/edit#base64:${encoded}`, '_blank');
                        Utils.showToast('✓ 快捷鍵啟動 (Alt+M)');
                    }
                }
            }
        });

        /* 頁面卸載：釋放所有 Blob URL */
        window.addEventListener('beforeunload', () => {
            observer.disconnect();
            document.querySelectorAll('[data-blob-url]').forEach(el => {
                if (el.dataset.blobUrl) URL.revokeObjectURL(el.dataset.blobUrl);
            });
        });

        /* 啟動 Banner */
        const platformStr = CONFIG.IS_IOS ? '📱 iOS (Blob)' : CONFIG.IS_CHROME ? '🖥 Chrome' : CONFIG.IS_FIREFOX ? '🦊 Firefox' : '🌐 Other';
        Utils.showToast(`✨ v5.0 已啟動 (${platformStr})<br>主題 + 互動渲染 + iOS 支援`, 3500);

        if (CONFIG.DEBUG) {
            console.log(
                '%c🚀 Gemini Unified v5.0 已啟動',
                'background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 20px; border-radius: 10px; font-weight: bold; font-size: 14px;'
            );
            console.log('平台:', platformStr, '| iOS:', CONFIG.IS_IOS, '| Chrome:', CONFIG.IS_CHROME);
        }

        log('✅ Initialization completed');
    }

    /* 啟動時機控制 */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        /* Chrome 額外延遲：DOM 完全穩定後再啟動 */
        CONFIG.IS_CHROME ? setTimeout(init, 100) : init();
    }

})();
