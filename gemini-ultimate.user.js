// ==UserScript==
// @name         Gemini Ultimate: Unified Renderer & Theme v6.0 Industrial UX
// @namespace    http://tampermonkey.net/
// @version      6.0.0
// @description  Industrial-grade UX enhancement: Micro-interactions, Skeleton Loading, Gesture Control, Keyboard Nav, State Persistence, Virtual Scrolling, Smart Tooltips
// @author       Unified Integration Pro
// @match        https://gemini.google.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
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
        ],

        /* === v6.0 Industrial UX Features === */
        /* 微互動動畫時長 */
        ANIMATION_DURATION: 250,
        ANIMATION_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',

        /* Skeleton Loading */
        SKELETON_ENABLED: true,
        SKELETON_ANIMATION_DURATION: 1500,

        /* 手勢控制靈敏度 */
        GESTURE_SWIPE_THRESHOLD: 50,
        GESTURE_PINCH_THRESHOLD: 0.1,

        /* 鍵盤導航 */
        KEYBOARD_NAV_ENABLED: true,

        /* 狀態持久化 */
        STATE_PERSISTENCE_ENABLED: true,
        STATE_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days

        /* 虛擬滾動閾值 */
        VIRTUAL_SCROLL_THRESHOLD: 50,

        /* Smart Tooltip */
        TOOLTIP_DELAY: 300,
        TOOLTIP_FADE_DURATION: 200,

        /* === Industrial Auto-Collapse Panel & Visual Aura === */
        UI_AURA: {
            SELECTORS: {
                TARGET: '.ui-improvements-phase, .edge-to-edge, chat-app form.chat-app', // User spec + robust fallbacks
                FALLBACK: '.chat-input-container, rich-textarea' // 降級目標
            },
            ANIMATION: {
                SCALE_DOWN: 0.7,
                Y_OFFSET: '-15px',
                TIMING: '0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            },
            PHYSICS: {
                AGENT_COUNT: 40,
                MAX_SPEED: 2,
                MAX_FORCE: 0.05
            }
        },

        /* === Private GEMs (Local Prompts Extension) === */
        CUSTOM_GEMS:[
            { id: 'gem-translator', icon: '🌐', title: 'Translator (zh-TW)', desc: '繁中翻譯', prompt: 'Please translate the following text into elegant Traditional Chinese. Ensure it retains professional terminology and natural phrasing:\n\n' },
            { id: 'gem-standard-llm', icon: '🤖', title: '標準化語言模型決策器', desc: '整合 FFC、SCQA、STAR、PREP 等 12 項核心表達模型的最佳化決策策略', prompt: '請依據情境選用最佳化決策策略回應。工具庫包含：1.FFC（感受/事實/期待）；2.SCQA（情境/衝突/問題/答案）；3.STAR（情境/任務/行動/結果）；4.FIRE（事實/解讀/反應/結果）；5.PREP（觀點/理由/例子/重述）；6.RIDE（風險/利益/差異/影響）；7.SCRTV（情境/衝突/原因/策略/價值）；8.FAB模型（Function/Advantages/Benefit）；9.六頂思考帽子與無權重決策矩陣表格；10.第一性原理+費曼總結+表格+Mermaid；11.競品分析「3層漏斗機制」（概念層/邏輯層/系統層Mermaid）；12.多模態推理框架（CoT+ReAct+ToT+自一致性）。\n\n【特殊觸發字】末尾帶「66」用項目9；「==」用項目12；「--」或「—」用項目10；「33」用項目11。\n\n【回覆約束】\n1. 直奔核心，說明選用模型，組合成自然、親切且專業的文字。\n2. 嚴禁 AI 煽情、客套、贅詞、生硬感。\n3. 避免過度使用連接詞，禁用邏輯鏈（首先、其次、最後、此外、因此、由此可見、確實、事實上）、總結詞（綜上所述、總的來說、顯而易見）、絕對化表達（完美方案、徹底解決、確保、以確保、全方位保障）。\n4. Mermaid 圖表內換行符 \\n 必須替換為 <br>，且行末不得有 <br>。\n\n' },
            { id: 'gem-text-proofreader', icon: '✍️', title: '首席校稿總編輯', desc: '修正台灣繁體錯別字、語言癌與 AI 腔，輸出出版級文本', prompt: '請扮演 Google DeepMind 首席中文語言學家兼台灣資深出版總編輯。基於「精簡、精確、信達雅」原則，針對提供的文本進行深度校對與潤飾，嚴格執行以下流程：\n\n【校對標準】\n1. 錯誤偵測：修正形近/音近字，嚴格區分「的、得、地」，標點符號一律改為全形並符合教育部規範（禁用波浪號 ~）。\n2. 消除語言癌：刪除冗贅動詞（如「進行一個...的動作」改為直接動詞）與口語填充字（做一個...的部分、基本上、其實、那）。\n3. 去除 AI 味：禁用破折號補充說明（改用逗號/句號），拒絕油膩排比句與西式被動語態（改為主動語態）。\n4. 邏輯風格優化：長句適當斷句，遵守「最小干預原則」，保持原作者語氣。\n\n【負向約束】嚴禁說教與客套話，不輸出「身為語言模型...}」等語句。保持事實，不捏造數據。\n\n【輸出格式】\n### 第一部分：修訂對照表 (Markdown Table)\n| 原文 | 修改後 | 修改原因 (標註：錯字、語言癌、標點、語氣潤飾) |\n| :--- | :--- | :--- |\n### 第二部分：校對後全文\n\n' },
            { id: 'gem-industrial-architect', icon: '💻', title: '工控代碼架構師', desc: '專精 C#、C++、Python 工控系統、多執行緒優化與資源治理的架構指南', prompt: '請扮演 C#、C++、Python 專業代碼架構師。依序代碼順序選用：C# > C++。遵循四大原則：1.動手前思考（明確假設、拒絕模糊）；2.至簡至上（無預期功能與多餘抽象）；3.精確微創修改（不修相鄰無損代碼，符合既有風格）；4.目標驅動執行（建立 IMPLEMENTATION_PLAN.md、編寫測試、驗證邊界）。\n\n【架構與優化範疇】\n1. 效能調優與資源治理：使用語言原生 Profiler 分析 Spot，設計 Lock-free 結構、TPL 多執行緒優化或 OpenMP 並行計算；嚴格執行資源釋放（C# Dispose, C++ RAII）與 GC 治理（ pause ≤ 200ms）。\n2. 單元測試：覆蓋正負向、邊界（Null、極值）與高併發壓力測試，確保核心邏輯覆蓋率 ≥ 80%。\n3. 錯誤診斷：依循 [問題定位] → [根因分析] → [修復方案] → [驗證方法] 輸出。\n4. 架構重構：繪製 Mermaid 模組圖，降低圈複雜度 ≥ 40%，提升響應速度 ≥ 30%。\n\n' },
            { id: 'gem-debugger', icon: '🐛', title: 'Bug Hunter', desc: '根本原因分析與BUG修復', prompt: 'Act as a senior debugging engineer. Analyze the following error log or buggy code, determine the root cause step-by-step, and propose a robust fix:\n\n' },
            { id: 'gem-coder', icon: '💻', title: 'Senior Developer', desc: '程式碼審查和優化', prompt: 'As a Senior Developer, please review the following requirements/code. Focus on performance, security, and industrial-grade practices:\n\n' },
            { id: 'gem-weightlifting-biomechanics', icon: '🏋️‍♂️', title: '舉重生物力學分析系統', desc: '抓舉與挺舉的運動學數據提取、逐幀分析與第一性原理技術修正', prompt: '請扮演奧林匹克舉重（抓舉/挺舉）生物力學分析專家系統。請依據輸入參數（動作項目、影片幀率、專注核心）對影像進行動態學數據提取，並依專業標準提供技術修正方案。本系統一律以繁體中文回覆，且必須大量運用商業級 Mermaid 代碼與多維度數據表格進行深入拆解。\n\n【分析框架與核心指標】\n1. 階段劃分（Phase Segmentation）：\n   - 第一拉引（地面至膝關節）\n   - 第二拉引（膝關節至發力點/伸展）\n   - 第三拉引（發力轉身/下穿至槓下）\n   - 接槓與站起支撐\n2. 評估維度：\n   - 槓頭軌跡（Bar Path）：水平位移量（是否繞槓/微幅環繞）、垂直加速度峰值。\n   - 關節運動學（Joint Kinematics）：最大發力時的髖、膝、踝關節伸展角度。\n   - 步法（Footwork）：雙腳接觸時機與左右/前後位移量。\n   - 質心（COM）：整體動作過程中的重心動態平衡。\n\n【輸出結構與約束】\n1. 數據摘要與逐幀分析：必須使用 Markdown 表格詳列關鍵位置的關節角度與動態參數。\n2. 技術缺失根因分析：運用第一性原理（First Principles）直擊核心錯誤（Root Cause），嚴禁籠統模糊的字眼，全面採用量化描述。\n3. 修正訓練協定：提供具體的針對性輔助訓練動作與教練提示詞（Cues）。\n4. 可視化呈現：必須利用商業級 Mermaid 代碼（如流程圖、時序圖或狀態圖）與多維度表格，呈現各階段關鍵點分析與最終結論。\n\n' },
            { id: 'gem-4K', icon: '🇰🇰🇰🇰', title: '4K HD', desc: '高清圖片轉換', prompt: '請扮演資深影像處理與數位修復專家，精通計算機視覺、超解析度重建、色彩科學及 PBR 無損影像復原。執行商業級高保真影像資產重製與 4K 無損放大作業，嚴格控管 SSIM 與原圖特徵偏差率於 0%，僅提升微觀細節資訊密度與動態範圍。\n\n【核心工作流】\n1. 幾何與特徵絕對鎖定：解析並鎖定原圖面部結構特徵點、骨骼比例、視線向量、肢體姿態、機位透視及構圖座標，執行 1:1 絕對空間映射。\n2. 物理級微觀紋理增強：運用高頻率細節增強演算法，精確重建毛孔、細紋、髮絲、睫毛、織物纖維（縫線）及材質邊緣，確保 Photorealistic 物理質感。\n3. 光度與色彩空間同步：提取原圖色彩空間、白平衡及光線向量，確保光影對比、強度及 Tone Mapping 完全對齊，僅擴展寬容度與邊緣銳利度。\n\n【否定邊界】\n1. 絕對禁止引入非原圖物理特徵的生成式幻覺（Hallucination）或藝術風格化（Stylization）。\n2. 絕對禁止執行重新佈光（Relighting）、改變幾何形體或變更服裝、毛髮、皮膚與背景之空間位置。\n3. 絕對禁止使用平滑化濾鏡（如過度磨皮、消除自然皮膚紋理）。\n【輸出格式】\n 4K圖片\n\n ' },
            { id: 'gem-commercial-prompt-engineering', icon: '🎨', title: '商業級高保真影像生成提示詞專家', desc: '基於受控瑕疵美學（Controlled Imperfection）的商業人像與品牌情境生成框架', prompt: '請扮演商業級高保真影像生成提示詞專家，基於「受控瑕疵美學（Controlled Imperfection）」核心概念，產出標準英文格式的影像提示詞，以消除 AI 塑膠感並建立真實皮膚與光學細節。\n\n【核心模組關鍵字庫】\n1. 肌理層（Texture Layer）：Raw photo, hyperrealistic, highly detailed skin texture, visible pores, subtle skin imperfections, authentic skin tone, high frequency details（商業案禁用 freckles，改用 pores 與 texture）。\n2. 光影層（Lighting Layer）：\n   - Studio 時尚：Studio lighting, hard light, rim lighting, volumetric lighting, high contrast, professional photography\n   - 生活抓拍：Natural lighting, side lighting, sunlight casting shadows, dynamic shadows, complex lighting\n   - 創意閃光：Flash photography, direct harsh flash, vignette, night flash\n3. 鏡頭層（Optical Layer）：85mm lens, f/1.8, depth of field, bokeh, film grain, slight chromatic aberration, analog film aesthetic（禁用 motion blur/light leaks，改用 depth of field/bokeh 保持畫面乾淨）。\n\n【組合範本定義】\n- 高階商業人像：Raw photo, close-up portrait, highly detailed skin texture, visible pores, hard studio lighting, rim light, sharp focus on eyes, 85mm lens, f/1.8, depth of field, subtle film grain, 8k resolution, Hasselblad X1D\n- 品牌情境照：Raw photo, candid shot, authentic moment, uneven skin tone, natural side lighting, harsh shadows, film grain, Kodak Portra 400, slightly imperfect composition, realistic texture\n\n【負向提示詞與參數指導】\n- 排除詞：smooth skin, plastic skin, airbrushed, cartoon, anime, 3d render, global illumination, flat lighting, overexposed, bad anatomy, blurry, low quality\n- 參數基準：CFG Scale: 4.0（提升自然度、防油膩）；Steps: 30（確保紋理迭代）；Denoising Strength (Img2Img/Inpainting): 0.35（保留原圖特徵並增強細節）。\n\n' },
            { id: 'gem-refactor', icon: '🔨', title: 'Refactoring Master', desc: '清理、優化和現代化程式碼', prompt: 'Analyze the following code. Refactor it to improve readability, maintainability, and reduce cyclomatic complexity without changing its outward behavior. Use modern best practices:\n\n' },
            { id: 'gem-ux', icon: '🎨', title: 'UX/UI Designer', desc: '介面與可用性評估', prompt: 'From a UX/UI perspective, please analyze the following concept for usability, accessibility, and modern design metrics. Suggest concrete improvements:\n\n' },
            { id: 'gem-writer', icon: '📝', title: 'Tech Writer', desc: '專業文件撰寫', prompt: 'Act as an expert technical writer. Create clear, concise, and professional documentation (e.g., README, API doc) for the following:\n\n' },
            { id: 'gem-regex', icon: '🔍', title: 'Regex Expert', desc: 'Regex Gexplain', prompt: 'Generate a robust regular expression for the following requirement. Provide a clear breakdown of how the regex works and provide test cases:\n\n' },
        ]
    };

    const log = (...args) => CONFIG.DEBUG && console.log('[Gemini v6.0]', ...args);

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
    .model-response-text, markdown-renderer, .markdown-renderer, .tm-preview-view {
        color: var(--text-secondary) !important; font-family: var(--font-body) !important;
        line-height: var(--line-height) !important; font-size: var(--base-font-size) !important;
    }

    /* ── 標題系統 ── */
    .model-response-text h1, markdown-renderer h1, .tm-preview-view h1 {
        color: var(--accent-red) !important; font-weight: 800 !important; font-size: 1.75rem !important;
        margin-top: 1.5rem !important; margin-bottom: var(--spacing-unit) !important;
        border-bottom: 2px solid var(--bg-tertiary); padding-bottom: 0.5rem; line-height: 1.3;
    }
    .model-response-text h2, markdown-renderer h2, .tm-preview-view h2 {
        color: var(--accent-blue) !important; font-weight: 700 !important; font-size: 1.5rem !important;
        margin-top: 1.25rem !important; margin-bottom: 0.6rem !important; line-height: 1.35;
    }
    .model-response-text h3, markdown-renderer h3, .tm-preview-view h3 {
        color: var(--accent-yellow) !important; font-weight: 600 !important; font-size: 1.25rem !important;
        margin-top: 1rem !important; margin-bottom: 0.5rem !important; line-height: 1.4;
    }
    .model-response-text h4, markdown-renderer h4, .tm-preview-view h4 {
        color: var(--accent-green) !important; font-weight: 600 !important;
        font-size: 1.1rem !important; margin-top: 0.875rem !important;
    }
    .model-response-text p, markdown-renderer p, .tm-preview-view p { margin-bottom: var(--spacing-unit) !important; line-height: var(--line-height); }
    .model-response-text strong, markdown-renderer strong,
    .model-response-text b, markdown-renderer b, .tm-preview-view strong, .tm-preview-view b { color: var(--accent-orange) !important; font-weight: 700 !important; }
    .model-response-text em, markdown-renderer em, .tm-preview-view em { color: var(--accent-purple) !important; font-style: italic; }
    .model-response-text a, markdown-renderer a, .tm-preview-view a {
        color: var(--accent-aqua) !important; text-decoration: none !important;
        border-bottom: 1px dashed var(--accent-aqua); transition: all 0.2s ease; padding-bottom: 1px;
    }
    .model-response-text a:hover, markdown-renderer a:hover, .tm-preview-view a:hover { background: rgba(142,192,124,0.15); border-bottom-style: solid; }

    /* ── 列表 ── */
    .model-response-text ul, markdown-renderer ul, .tm-preview-view ul,
    .model-response-text ol,  markdown-renderer ol, .tm-preview-view ol {
        margin: var(--spacing-unit) 0 !important; margin-left: 1.5rem !important; padding-left: 0.5rem !important;
    }
    .model-response-text li, markdown-renderer li, .tm-preview-view li { margin-bottom: 0.4rem !important; line-height: var(--line-height); }
    .model-response-text li::marker, markdown-renderer li::marker, .tm-preview-view li::marker { color: var(--accent-purple) !important; font-weight: 600; }

    /* ── 引用 ── */
    .model-response-text blockquote, markdown-renderer blockquote, .tm-preview-view blockquote {
        border-left: 4px solid var(--accent-purple) !important;
        background: rgba(60,56,54,0.35) !important; color: var(--text-muted) !important;
        margin: var(--spacing-unit) 0 !important; padding: var(--spacing-unit) 1rem !important;
        border-radius: 0 0.5rem 0.5rem 0; font-style: italic; line-height: var(--line-height);
    }

    /* ── 表格（通用：工業級修復 Hover 重繪 Bug / 格線長駐） ── */
    /* 1. 父容器不允許出現橫向卷軸，防擠壓並強制換行 */
    .table-block, .tm-table-wrapper {
        overflow: hidden !important; /* 核心修正：將 overflow-x 升級為 overflow，防背景色蓋掉外邊框 rounded corners */
        width: 100% !important; max-width: 100% !important;
        box-sizing: border-box !important;
        border-radius: 0.5rem;
        box-shadow: 0 0.25rem 0.5rem rgba(0,0,0,0.3);
        border: 5px solid var(--border-color) !important;
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
        table-layout: fixed !important;
    }
    /* 3. 獨立繪製單元格邊界 (Separated Grid Pattern) */
    .model-response-text th, .model-response-text td,
    markdown-renderer th, markdown-renderer td, th, td {
        border: none !important;
        border-bottom: 3px solid var(--border-color) !important;
        border-right: 3px solid var(--border-color) !important;
        padding: 0.75rem 1rem !important;
        font-family: var(--font-body) !important;
        font-size: var(--base-font-size) !important;
        word-break: break-all !important; /* 強制在任何字元間換行，徹底防止擠壓與橫向滾動 */
        overflow-wrap: anywhere !important; /* 支援現代瀏覽器最細緻換行邊界 */
        white-space: normal !important; /* 強制換行，取代 nowrap 及不自動換行 */
        vertical-align: middle !important;
    }
    /* 消除邊角多餘格線 */
    th:last-child, td:last-child { border-right: none !important; }
    tr:last-child td { border-bottom: none !important; }

    /* 徹底清除表格下緣無用、佔位且遮擋邊界之 Gemini 官方原生滾動輔助導航欄、滾動按鈕、三點選單導航區 */
    linear-scroll-assistant,
    .linear-scroll-assistant,
    .scroll-assistant,
    .table-navigator,
    .scroller-button,
    button[aria-label*="scroll"],
    div[class*="scroll-assistant"],
    div[class*="table-navigator"] {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }

    th {
        background: linear-gradient(135deg, #3c3836 0%, #282828 100%) !important;
        color: var(--accent-green) !important; font-weight: 700 !important;
        text-transform: uppercase; letter-spacing: 0.05em;
        border-bottom: 5px solid var(--accent-green) !important;
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
        white-space: normal !important; overflow-wrap: anywhere !important;
        word-wrap: break-word !important; word-break: break-all !important; max-width: 0 !important;
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
        text-decoration: none !important;
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
        width: 85%; max-width: 100%; box-sizing: border-box; margin-top: 16px;
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

    /* ── Excel-like 橫向拖曳欄寬調整 ── */
    .tm-resizable-cell {
        position: relative !important;
    }
    .tm-col-resizer {
        position: absolute !important;
        top: 0 !important;
        right: -3px !important; /* 精確半交疊覆蓋，便於觸發 */
        bottom: 0 !important;
        width: 8px !important;
        cursor: col-resize !important;
        z-index: 100 !important;
        user-select: none !important;
        transition: background 0.15s ease-in-out;
        background: transparent;
    }
    .tm-resizable-cell:hover .tm-col-resizer {
        background: rgba(26, 115, 232, 0.15); /* 輕微懸停提示 */
    }
    .tm-col-resizer:hover {
        background: var(--accent-blue, #1a73e8) !important; /* 高亮度懸停線 */
        opacity: 0.8 !important;
    }
    .tm-col-resizer.tm-resizing {
        background: var(--accent-blue, #1a73e8) !important;
        width: 4px !important;
        right: -1px !important;
        opacity: 1 !important;
        box-shadow: 0 0 8px var(--accent-blue, #1a73e8); /* 工業級指示光暈 */
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
        display: none !important; /* 預設隱藏 */
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
        white-space: normal !important;
    }
    /* 為 Markdown 的內容提供限制，避免圖片或表格超出邊界 */
    .tm-preview-view img { max-width: 100%; height: auto; }
    .tm-preview-view pre, .tm-preview-view code { max-width: 100%; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; box-sizing: border-box; }
    .tm-preview-view table { display: table !important; width: 100% !important; max-width: 100% !important; table-layout: fixed !important; overflow-x: hidden !important; box-sizing: border-box; }

    /* 雙面卡片模式 (Inline) Markdown / CSV */
    .tm-state-inline-preview .tm-raw-view { display: none !important; }
    .tm-state-inline-preview .tm-preview-view {
        display: block !important;
        animation: tmFadeInUp 0.3s forwards;
    }

    /* Iframe 渲染模式 Mermaid / HTML */
    .tm-state-iframe-preview .tm-raw-view { display: none !important; }
    .tm-state-iframe-preview .tm-preview-view { display: none !important; }

    @keyframes tmFadeInUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* === Industrial Auto-Collapse Panel & Visual Aura CSS === */
    .gemini-ui-smart-container {
        transition: max-width ${CONFIG.UI_AURA.ANIMATION.TIMING},
                    height ${CONFIG.UI_AURA.ANIMATION.TIMING},
                    padding ${CONFIG.UI_AURA.ANIMATION.TIMING},
                    margin ${CONFIG.UI_AURA.ANIMATION.TIMING},
                    border-radius ${CONFIG.UI_AURA.ANIMATION.TIMING},
                    transform ${CONFIG.UI_AURA.ANIMATION.TIMING},
                    opacity ${CONFIG.UI_AURA.ANIMATION.TIMING},
                    box-shadow ${CONFIG.UI_AURA.ANIMATION.TIMING},
                    bottom ${CONFIG.UI_AURA.ANIMATION.TIMING};
        transform-origin: bottom center;
        will-change: width, max-width, height, margin, transform, opacity, bottom;
        z-index: 1000;
        margin-left: auto;
        margin-right: auto;
    }

    .gemini-ui-expanded {
        max-width: 100%;
        transform: translateY(0);
        opacity: 1;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        position: relative !important;
        bottom: auto !important;
        left: auto !important;
    }

    .gemini-ui-collapsed {
        max-width: 140px !important;
        height: 48px !important;
        min-height: 48px !important;
        padding: 0 !important;
        margin: 0 !important;
        opacity: 0.95;
        box-shadow: 0 8px 32px rgba(0,0,0,0.25) !important;
        cursor: pointer !important;
        border-radius: 40px !important;
        background: var(--bg-secondary) !important;
        border: 1px solid var(--vs-border) !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;

        /* 極度置底與置中：脫離文件流，解鎖上方空間 */
        position: fixed !important;
        bottom: 24px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        backdrop-filter: blur(12px) !important;
    }

    .gemini-ui-collapsed::before {
        content: '✍️ Chat';
        font-family: var(--font-body);
        font-weight: 600;
        font-size: 15px;
        letter-spacing: 0.5px;
        color: var(--text-primary);
        pointer-events: none;
    }

    /* Hide all actual children inside the capsule */
    .gemini-ui-collapsed > * {
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        visibility: hidden !important;
    }

    .gemini-ui-collapsed:hover {
        opacity: 1;
        max-width: 155px !important;
        box-shadow: 0 12px 36px rgba(0,0,0,0.35) !important;
        transform: translateX(-50%) translateY(-2px) !important;
        background: var(--bg-tertiary) !important;
    }

    /* === v6.0 Industrial UX: Micro-interactions & Animations === */
    /* 按鈕微互動：點擊漣漪效果 */
    @keyframes tmRipple {
        0% { transform: scale(0); opacity: 0.5; }
        100% { transform: scale(4); opacity: 0; }
    }
    .tm-ripple-effect {
        position: relative;
        overflow: hidden;
    }
    .tm-ripple-effect::after {
        content: '';
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: tmRipple 0.6s ease-out;
        pointer-events: none;
    }

    /* Skeleton Loading 骨架螢幕 */
    @keyframes tmSkeletonShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    .tm-skeleton {
        background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
        background-size: 200% 100%;
        animation: tmSkeletonShimmer ${CONFIG.SKELETON_ANIMATION_DURATION}ms infinite;
        border-radius: 0.5rem;
        pointer-events: none;
    }
    .tm-skeleton-text { height: 1rem; margin-bottom: 0.5rem; }
    .tm-skeleton-title { height: 1.5rem; width: 60%; margin-bottom: 1rem; }
    .tm-skeleton-image { height: 200px; width: 100%; }

    /* Smart Tooltip 智能提示框 */
    .tm-tooltip {
        position: relative;
    }
    .tm-tooltip::before {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-8px);
        background: var(--vs-bg);
        color: var(--text-primary);
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.85rem;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all ${CONFIG.TOOLTIP_FADE_DURATION}ms ${CONFIG.ANIMATION_EASING};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 1px solid var(--border-color);
        z-index: 10000;
        pointer-events: none;
    }
    .tm-tooltip:hover::before {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(-4px);
    }

    /* 鍵盤導航高亮 */
    .tm-keyboard-highlight {
        outline: 2px solid var(--accent-yellow) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(250, 189, 47, 0.2) !important;
    }

    /* 手勢反饋動畫 */
    @keyframes tmSwipeLeft {
        0% { transform: translateX(0); }
        50% { transform: translateX(-10px); }
        100% { transform: translateX(0); }
    }
    @keyframes tmSwipeRight {
        0% { transform: translateX(0); }
        50% { transform: translateX(10px); }
        100% { transform: translateX(0); }
    }
    .tm-swipe-left { animation: tmSwipeLeft 0.3s ${CONFIG.ANIMATION_EASING}; }
    .tm-swipe-right { animation: tmSwipeRight 0.3s ${CONFIG.ANIMATION_EASING}; }

    /* 狀態持久化指示器 */
    .tm-state-indicator {
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: var(--vs-bg);
        border: 1px solid var(--accent-green);
        border-radius: 0.5rem;
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
        color: var(--accent-green);
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ${CONFIG.ANIMATION_EASING};
        z-index: 99999;
        pointer-events: none;
    }
    .tm-state-indicator.tm-show {
        opacity: 1;
        transform: translateY(0);
    }

    /* 虛擬滾動容器優化 */
    .tm-virtual-scroll-container {
        contain: strict;
        content-visibility: auto;
    }

    /* 閱讀進度指示器 */
    .tm-reading-progress {
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--accent-green), var(--accent-aqua));
        z-index: 100000;
        transition: width 0.1s linear;
    }

    /* 快速操作選單 (Radial Menu) */
    .tm-radial-menu {
        position: fixed;
        z-index: 99998;
        pointer-events: none;
    }
    .tm-radial-menu-item {
        position: absolute;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--vs-bg);
        border: 2px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        pointer-events: auto;
        opacity: 0;
        transform: scale(0);
        transition: all 0.2s ${CONFIG.ANIMATION_EASING};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .tm-radial-menu-active .tm-radial-menu-item {
        opacity: 1;
        transform: scale(1);
    }
    .tm-radial-menu-item:hover {
        background: var(--accent-blue);
        border-color: var(--accent-blue);
        transform: scale(1.1);
    }

    /* 內容卡片懸浮效果 */
    .tm-card-hover {
        transition: transform 0.2s ${CONFIG.ANIMATION_EASING}, box-shadow 0.2s ${CONFIG.ANIMATION_EASING};
    }
    .tm-card-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }

    /* 加載狀態脈衝 */
    @keyframes tmPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }
    .tm-loading-pulse {
        animation: tmPulse 1.5s ease-in-out infinite;
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
            el.innerHTML = `<strong>Gemini v6.0</strong>${msg}`;
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('tm-show'));
            setTimeout(() => { el.classList.remove('tm-show'); setTimeout(() => el.remove(), 300); }, duration);
        },

        /* === v6.0 Industrial UX: State Persistence === */
        saveState(key, value) {
            if (!CONFIG.STATE_PERSISTENCE_ENABLED || typeof GM_setValue === 'undefined') return;
            try {
                GM_setValue(key, {
                    value: value,
                    timestamp: Date.now()
                });
                this.showStateIndicator('已儲存');
            } catch (e) { log('State save error:', e); }
        },

        loadState(key) {
            if (!CONFIG.STATE_PERSISTENCE_ENABLED || typeof GM_getValue === 'undefined') return null;
            try {
                const stored = GM_getValue(key);
                if (stored && (Date.now() - stored.timestamp) < CONFIG.STATE_EXPIRY_MS) {
                    return stored.value;
                }
                GM_setValue(key, undefined); // Clean expired
            } catch (e) { log('State load error:', e); }
            return null;
        },

        showStateIndicator(msg) {
            let indicator = document.querySelector('.tm-state-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'tm-state-indicator';
                document.body.appendChild(indicator);
            }
            indicator.textContent = msg;
            indicator.classList.add('tm-show');
            setTimeout(() => indicator.classList.remove('tm-show'), 2000);
        },

        /* === v6.0 Industrial UX: Ripple Effect === */
        addRippleEffect(element) {
            if (!element.classList.contains('tm-ripple-effect')) {
                element.classList.add('tm-ripple-effect');
            }
            element.addEventListener('click', function(e) {
                const rect = element.getBoundingClientRect();
                const ripple = element.querySelector('.tm-ripple-effect::after');
                if (ripple) {
                    ripple.style.left = `${e.clientX - rect.left}px`;
                    ripple.style.top = `${e.clientY - rect.top}px`;
                }
            });
        },

        /* === v6.0 Industrial UX: Smart Tooltip === */
        initTooltip(element, text) {
            if (!element.classList.contains('tm-tooltip')) {
                element.classList.add('tm-tooltip');
            }
            element.setAttribute('data-tooltip', text);
        },

        /* === v6.0 Industrial UX: Keyboard Navigation === */
        highlightForKeyboard(element) {
            element.classList.add('tm-keyboard-highlight');
            setTimeout(() => element.classList.remove('tm-keyboard-highlight'), 2000);
        },

        /* === v6.0 Industrial UX: Reading Progress === */
        initReadingProgress() {
            let progressBar = document.querySelector('.tm-reading-progress');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'tm-reading-progress';
                document.body.appendChild(progressBar);
            }
            window.addEventListener('scroll', () => {
                const scrollTop = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const progress = (scrollTop / docHeight) * 100;
                progressBar.style.width = `${progress}%`;
            });
        },

        /* Base64 URL 安全編碼（用於 mermaid.live） */
        base64UrlEncode(str) {
            try {
                return btoa(unescape(encodeURIComponent(str)))
                    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            } catch (e) { log('Base64 encode error:', e); return null; }
        },

        /* 開啟網頁（相容手機與彈窗攔截） */
        openUrl(url) {
            if (CONFIG.IS_MOBILE) {
                window.location.href = url;
            } else if (typeof GM_openInTab !== 'undefined') {
                GM_openInTab(url, { active: true });
            } else {
                const win = window.open(url, '_blank');
                if (!win) window.location.href = url;
            }
        },

        /* 取得代碼文字 */
        getCodeText(block) {
            const el = block.tagName === 'CODE' ? block : (block.querySelector('code') || block);
            return (el.textContent || el.innerText || '').trim();
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
        forceReflow(el) { if (CONFIG.IS_CHROME) void el.offsetHeight; },

        /* === v6.0 Industrial UX: Skeleton Loading === */
        createSkeleton(type = 'text', count = 3) {
            const container = document.createElement('div');
            for (let i = 0; i < count; i++) {
                const skeleton = document.createElement('div');
                skeleton.className = `tm-skeleton tm-skeleton-${type}`;
                container.appendChild(skeleton);
            }
            return container;
        },

        replaceWithSkeleton(target, type, count) {
            const skeleton = this.createSkeleton(type, count);
            target.style.opacity = '0';
            setTimeout(() => {
                target.parentNode.replaceChild(skeleton, target);
                target.style.opacity = '1';
            }, 300);
            return skeleton;
        },

        restoreFromSkeleton(skeleton, target) {
            if (skeleton && skeleton.parentNode) {
                skeleton.parentNode.replaceChild(target, skeleton);
            }
        }
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
            const btn = document.createElement('a');
            btn.className = 'tm-action-btn tm-btn-mermaid';
            btn.target = '_blank';
            btn.rel = 'noopener noreferrer';
            btn.setAttribute('role', 'link');
            btn.setAttribute('aria-label', 'Mermaid Live');
            btn.style.setProperty('color', '#000000', 'important');

            const iconSvg = '<svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-7h-2v7z"/></svg>';
            btn.innerHTML = `${iconSvg}<span class="tm-btn-text-full">Mermaid Live</span>`;

            const updateHref = () => {
                try {
                    const code = Utils.getCodeText(codeEl);
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
                        btn.href = `https://mermaid.live/edit#base64:${encoded}`;
                    }
                } catch (e) {
                    log('Error updating Mermaid Live href:', e);
                }
            };

            btn.addEventListener('mouseenter', updateHref);
            btn.addEventListener('touchstart', updateHref, { passive: true });
            btn.addEventListener('focus', updateHref);
            btn.addEventListener('click', () => {
                Utils.showToast('✓ Mermaid Live 已開啟');
            });
            updateHref();

            if (CONFIG.IS_CHROME) requestAnimationFrame(() => Utils.forceReflow(btn));

            return btn;
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
                    overlay.style.paddingTop = isMermaid && !overlay.querySelector('.tm-btn-mermaid')?'0':'2%';
                    overlay.style.paddingLeft = isMermaid && !overlay.querySelector('.tm-btn-mermaid')?'0':'2%';
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

    /* --- § 12.4.5 HPC Table Autofit Engine (自動化自調欄寬高效能運算引擎) --- */
    const HpcTableAutofitEngine = {
        queue: new Set(),
        debounceTimer: null,
        isProcessing: false,

        queueTable(table) {
            if (!table || !table.isConnected) return;
            this.queue.add(table);
            this.schedule();
        },

        schedule() {
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                requestAnimationFrame(() => this.processQueue());
            }, 80); // 80ms debounce perfectly balances live response and CPU budget for streaming
        },

        processQueue() {
            if (this.isProcessing) return;
            this.isProcessing = true;

            const tables = Array.from(this.queue).filter(t => t.isConnected);
            this.queue.clear();

            if (tables.length === 0) {
                this.isProcessing = false;
                return;
            }

            // --- HPC Batch Phase 1: Write (Preparation) ---
            // Batch all reset operations together to allow the browser to process style recalculation in one single pass
            const backups = [];
            tables.forEach(table => {
                const trs = table.querySelectorAll('tr');
                if (trs.length === 0) return;
                const firstRow = trs[0];
                const cells = firstRow.querySelectorAll('th, td');
                if (cells.length === 0) return;

                const tableBackups = [];
                trs.forEach(row => {
                    const rowCells = row.querySelectorAll('th, td');
                    rowCells.forEach(c => {
                        tableBackups.push({
                            el: c,
                            whiteSpace: c.style.whiteSpace
                        });
                    });
                });

                backups.push({
                    table,
                    cells,
                    trs,
                    numCols: cells.length,
                    tableBackups
                });

                // Write Layout Parameters
                table.style.setProperty('table-layout', 'auto', 'important');
                table.style.setProperty('width', 'max-content', 'important');
                table.style.setProperty('min-width', 'max-content', 'important');

                trs.forEach(row => {
                    const rowCells = row.querySelectorAll('th, td');
                    rowCells.forEach(c => {
                        c.style.setProperty('width', 'auto', 'important');
                        c.style.setProperty('min-width', 'auto', 'important');
                        c.style.setProperty('white-space', 'nowrap', 'important');
                    });
                });
            });

            // --- HPC Batch Phase 2: Read (Measurement) ---
            // Now we read metric properties (scrollWidth) across all tables sequentially. Because we have already reset styles,
            // this reads from an aligned DOM state and causes ZERO layout thrashing.
            const results = [];
            backups.forEach(data => {
                const { numCols, trs, cells, table, tableBackups } = data;
                const optimalWidths = Array(numCols).fill(40);

                trs.forEach(row => {
                    const rowCells = row.querySelectorAll('th, td');
                    for (let idx = 0; idx < numCols; idx++) {
                        if (rowCells[idx]) {
                            const cellW = rowCells[idx].scrollWidth + 32; // Reserve padding offset
                            if (cellW > optimalWidths[idx]) {
                                optimalWidths[idx] = cellW;
                            }
                        }
                    }
                });

                // Safeguard limits: Math.min(500, Math.max(40, optimalWidth))
                for (let idx = 0; idx < numCols; idx++) {
                    optimalWidths[idx] = Math.min(500, Math.max(40, optimalWidths[idx]));
                }

                results.push({
                    table,
                    cells,
                    numCols,
                    optimalWidths,
                    tableBackups
                });
            });

            // --- HPC Batch Phase 3: Write (Restore & Style Application) ---
            // Finally we lock down the computed responsive percentages to ensure robust display and high scroll performance
            results.forEach(res => {
                const { table, cells, numCols, optimalWidths, tableBackups } = res;

                // Restore cell whiteSpace properties to allow natural wraps inside fixed boxes
                tableBackups.forEach(b => {
                    if (b.whiteSpace) {
                        b.el.style.setProperty('white-space', b.whiteSpace, 'important');
                    } else {
                        b.el.style.removeProperty('white-space');
                    }
                });

                table.style.setProperty('table-layout', 'fixed', 'important');
                table.style.setProperty('width', '100%', 'important');
                table.style.setProperty('min-width', '100%', 'important');

                const totalOptimalWidth = optimalWidths.reduce((sum, w) => sum + w, 0) || 1;
                cells.forEach((c, idx) => {
                    if (idx < numCols) {
                        const pctWidth = ((optimalWidths[idx] / totalOptimalWidth) * 100).toFixed(4) + '%';
                        c.style.setProperty('width', pctWidth, 'important');
                        c.style.setProperty('min-width', pctWidth, 'important');
                    }
                });
            });

            this.isProcessing = false;
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
                        rowData.push(`"${data}"`);
                    }
                    csv.push(rowData.join(','));
                }
                const csvString = csv.join('\n');

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
                GM_setClipboard(tableEl.innerText, 'text');
                Utils.showToast('📋 表格內容已複製');
            }
        },

        processTable(tableContainer) {
            const table = tableContainer.querySelector('table');
            if (!table) return;

            const sig = `${table.rows.length}_${table.innerText.length}`;
            const isProcessed = tableContainer.hasAttribute(this.tableProcessedAttr);

            if (isProcessed) {
                // 如果內容變更，自動排入佇列進行高效能自適應調寬
                if (table.dataset.tmTableSig !== sig) {
                    table.dataset.tmTableSig = sig;
                    HpcTableAutofitEngine.queueTable(table);
                }
                return;
            }

            // 確保父容器為 relative 以放置絕對定位的工具列
            if (getComputedStyle(tableContainer).position === 'static') {
                tableContainer.style.position = 'relative';
            }

            // 初始化特徵編碼
            table.dataset.tmTableSig = sig;

            // 🚨 工業級自動化 HPC 欄寬最適化：第一次處理時，直接將其加入 HPC 高效佇列中（靜默，無 Toast 打擾）
            HpcTableAutofitEngine.queueTable(table);

            const toolbar = document.createElement('div');
            toolbar.className = 'tm-table-toolbar';

            // 建立一鍵自調寬度按鈕 (手動點擊依然同步觸發並彈出 Toast 提供回饋)
            const fitBtn = Components.createButton('tm-btn-fold', '↔️', '自調欄寬', () => this.autoFitAllColumns(table, false));
            fitBtn.classList.replace('tm-btn-fold', 'tm-btn-mermaid');

            // 建立複製按鈕
            const copyBtn = Components.createButton('tm-btn-fold', '📋', '複製CSV', () => this.copyTableText(table));

            // 建立匯出按鈕
            const exportBtn = Components.createButton('tm-btn-fold', '📥', '匯出CSV', () => this.exportToCSV(table));

            toolbar.appendChild(fitBtn);
            toolbar.appendChild(copyBtn);
            toolbar.appendChild(exportBtn);
            tableContainer.appendChild(toolbar);

            // 載入高保真 Excel-like 欄寬調整與雙擊自適應核心
            this.makeTableResizable(table);

            tableContainer.setAttribute(this.tableProcessedAttr, 'true');
        },

        autoFitAllColumns(table, isSilent = false) {
            const firstRow = table.querySelector('tr');
            if (!firstRow) return;
            const cells = firstRow.querySelectorAll('th, td');
            const numCols = cells.length;
            if (numCols === 0) return;

            const trs = table.querySelectorAll('tr');

            // 儲存所有 cell 的原始寬度與樣式備份
            const allCellBackups = [];
            trs.forEach(row => {
                const rowCells = row.querySelectorAll('th, td');
                rowCells.forEach(c => {
                    allCellBackups.push({
                        el: c,
                        width: c.style.width,
                        minWidth: c.style.minWidth,
                        whiteSpace: c.style.whiteSpace
                    });
                });
            });

            // 臨時釋放版面限制以測量原生的自然寬度
            table.style.setProperty('table-layout', 'auto', 'important');
            table.style.setProperty('width', 'max-content', 'important');
            table.style.setProperty('min-width', 'max-content', 'important');

            trs.forEach(row => {
                const rowCells = row.querySelectorAll('th, td');
                rowCells.forEach(c => {
                    c.style.setProperty('width', 'auto', 'important');
                    c.style.setProperty('min-width', 'auto', 'important');
                    c.style.setProperty('white-space', 'nowrap', 'important');
                });
            });

            // 測量每一欄的最大 content 寬度
            const optimalWidths = Array(numCols).fill(40);
            trs.forEach(row => {
                const rowCells = row.querySelectorAll('th, td');
                for (let idx = 0; idx < numCols; idx++) {
                    if (rowCells[idx]) {
                        const cellW = rowCells[idx].scrollWidth + 32; // 預留微調內邊界補償
                        if (cellW > optimalWidths[idx]) {
                            optimalWidths[idx] = cellW;
                        }
                    }
                }
            });

            // 商業級最寬限制防呆：防止偶爾出現超長文字把欄位拉出上千像素
            for (let idx = 0; idx < numCols; idx++) {
                optimalWidths[idx] = Math.min(500, Math.max(40, optimalWidths[idx]));
            }

            // 恢復所有 Row 節點的原狀態
            allCellBackups.forEach(b => {
                b.el.style.width = b.width;
                b.el.style.minWidth = b.minWidth;
                b.el.style.whiteSpace = b.whiteSpace;
            });

            // 轉換為百分比並硬化 layout
            table.style.setProperty('table-layout', 'fixed', 'important');
            table.style.setProperty('width', '100%', 'important');
            table.style.setProperty('min-width', '100%', 'important');

            const totalOptimalWidth = optimalWidths.reduce((sum, w) => sum + w, 0) || 1;
            cells.forEach((c, idx) => {
                const pctWidth = ((optimalWidths[idx] / totalOptimalWidth) * 100).toFixed(4) + '%';
                c.style.setProperty('width', pctWidth, 'important');
                c.style.setProperty('min-width', pctWidth, 'important');
            });

            if (!isSilent) {
                Utils.showToast('📋 所有欄位寬度已智慧自適應最佳化');
            }
        },

        makeTableResizable(table) {
            const firstRow = table.querySelector('tr');
            if (!firstRow) return;

            const cells = firstRow.querySelectorAll('th, td');
            cells.forEach((cell, index) => {
                cell.classList.add('tm-resizable-cell');
                cell.style.setProperty('position', 'relative', 'important');

                if (cell.querySelector('.tm-col-resizer')) return;

                // 如果是最後一欄，不加 resizer (因為後面沒有下一欄可以互相擠壓)
                if (index === cells.length - 1) return;

                const resizer = document.createElement('div');
                resizer.className = 'tm-col-resizer';
                resizer.dataset.colIndex = index;
                resizer.title = '雙擊此處自動最適化此欄寬度，或手動拖曳調整';
                cell.appendChild(resizer);

                // === 雙擊特製 UX：智慧型 Auto-fit 單一欄寬 ===
                resizer.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const colIndex = parseInt(resizer.dataset.colIndex, 10);
                    const colCells = Array.from(cells);
                    const trs = table.querySelectorAll('tr');

                    // 1. 為了保留其他欄位的拉伸狀態，我們在發生重排前精準讀取各欄位原本的實體寬度
                    const origWidths = colCells.map(c => c.getBoundingClientRect().width || 100);

                    // 收集這張桌子中所有 tr 裡的第一代 cell 進行全面的樣式備份
                    const allCellBackups = [];
                    trs.forEach(row => {
                        const rowCells = row.querySelectorAll('th, td');
                        rowCells.forEach(c => {
                            allCellBackups.push({
                                el: c,
                                width: c.style.width,
                                minWidth: c.style.minWidth,
                                whiteSpace: c.style.whiteSpace
                            });
                        });
                    });

                    // 2. 解放整張 Table 來進行精確的自然尺寸測量
                    table.style.setProperty('table-layout', 'auto', 'important');
                    table.style.setProperty('width', 'max-content', 'important');
                    table.style.setProperty('min-width', 'max-content', 'important');

                    trs.forEach(row => {
                        const rowCells = row.querySelectorAll('th, td');
                        rowCells.forEach(c => {
                            c.style.setProperty('width', 'auto', 'important');
                            c.style.setProperty('min-width', 'auto', 'important');
                        });
                    });

                    // 3. 將目前雙擊的這欄單元格全部設為 white-space: nowrap，使其自然完全撐開，不被壓縮
                    const colRows = [];
                    trs.forEach(r => {
                        const rCells = r.querySelectorAll('th, td');
                        const targetCell = rCells[colIndex];
                        if (targetCell) {
                            colRows.push(targetCell);
                            targetCell.style.setProperty('white-space', 'nowrap', 'important');
                        }
                    });

                    // 4. 計算此欄所有單元格中，最大且最真實的 content 自然寬度
                    let optimalWidth = 50;
                    colRows.forEach(c => {
                        const cellW = Math.max(c.scrollWidth, c.getBoundingClientRect().width) + 32; // 超精確內距保護
                        if (cellW > optimalWidth) optimalWidth = cellW;
                    });

                    // 防呆限制：最窄 45px，最寬 500px，防止超長資料拉扁整張表格
                    optimalWidth = Math.min(500, Math.max(45, optimalWidth));

                    // 5. 測量完成後，立刻無縫還原這張桌子所有 cell 的原始寬度與折行樣式
                    allCellBackups.forEach(b => {
                        b.el.style.width = b.width;
                        b.el.style.minWidth = b.minWidth;
                        b.el.style.whiteSpace = b.whiteSpace;
                    });

                    // 6. 硬化佈局為 O(1) Fixed，以覆蓋後的寬度比例鎖定為 100% 總寬百分比
                    table.style.setProperty('table-layout', 'fixed', 'important');

                    // 覆蓋雙擊欄位的最優像素寬度
                    origWidths[colIndex] = optimalWidth;

                    const tableSumWidth = origWidths.reduce((sum, w) => sum + w, 0) || 1;
                    colCells.forEach((c, idx) => {
                        const pctWidth = ((origWidths[idx] / tableSumWidth) * 100).toFixed(4) + '%';
                        c.style.setProperty('width', pctWidth, 'important');
                        c.style.setProperty('min-width', pctWidth, 'important');
                    });

                    table.style.setProperty('width', '100%', 'important');
                    table.style.setProperty('min-width', '100%', 'important');

                    Utils.showToast('📋 欄位寬度已智慧最適化');
                });

                // === 頂級滑鼠拖曳 UX：Real-time 橫向動態調整 ===
                resizer.addEventListener('mousedown', (e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    e.stopPropagation();

                    resizer.classList.add('tm-resizing');

                    const colIndex = parseInt(resizer.dataset.colIndex, 10);
                    const colCells = Array.from(cells);

                    const startWidths = colCells.map(c => c.getBoundingClientRect().width);
                    table.style.setProperty('table-layout', 'fixed', 'important');

                    const startX = e.clientX;
                    const startWidth = startWidths[colIndex];
                    const nextStartWidth = startWidths[colIndex + 1];

                    document.body.style.setProperty('cursor', 'col-resize', 'important');
                    document.body.style.setProperty('user-select', 'none', 'important');

                    const onMouseMove = (moveEvent) => {
                        const dx = moveEvent.clientX - startX;

                        let targetWidth = startWidth + dx;
                        let targetNextWidth = nextStartWidth - dx;

                        const MIN_COL_WIDTH = 35;
                        if (targetWidth < MIN_COL_WIDTH) {
                            const diff = MIN_COL_WIDTH - targetWidth;
                            targetWidth = MIN_COL_WIDTH;
                            targetNextWidth -= diff;
                        }
                        if (targetNextWidth < MIN_COL_WIDTH) {
                            const diff = MIN_COL_WIDTH - targetNextWidth;
                            targetNextWidth = MIN_COL_WIDTH;
                            targetWidth -= diff;
                        }

                        const currentWidths = [...startWidths];
                        currentWidths[colIndex] = targetWidth;
                        currentWidths[colIndex + 1] = targetNextWidth;

                        const tableSumWidth = currentWidths.reduce((sum, w) => sum + w, 0) || 1;

                        colCells.forEach((c, idx) => {
                            const pctWidth = ((currentWidths[idx] / tableSumWidth) * 100).toFixed(4) + '%';
                            c.style.setProperty('width', pctWidth, 'important');
                            c.style.setProperty('min-width', pctWidth, 'important');
                        });

                        table.style.setProperty('width', '100%', 'important');
                        table.style.setProperty('min-width', '100%', 'important');
                    };

                    const onMouseUp = () => {
                        resizer.classList.remove('tm-resizing');
                        document.body.style.removeProperty('cursor');
                        document.body.style.removeProperty('user-select');

                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });

                // === 平板與移動端 Touch 支援 ===
                resizer.addEventListener('touchstart', (e) => {
                    if (e.touches.length !== 1) return;
                    const touch = e.touches[0];

                    resizer.classList.add('tm-resizing');

                    const colIndex = parseInt(resizer.dataset.colIndex, 10);
                    const colCells = Array.from(cells);
                    const startWidths = colCells.map(c => c.getBoundingClientRect().width);

                    table.style.setProperty('table-layout', 'fixed', 'important');

                    const startX = touch.clientX;
                    const startWidth = startWidths[colIndex];
                    const nextStartWidth = startWidths[colIndex + 1];

                    const onTouchMove = (moveEvent) => {
                        if (moveEvent.touches.length !== 1) return;
                        const currentTouch = moveEvent.touches[0];
                        const dx = currentTouch.clientX - startX;

                        let targetWidth = startWidth + dx;
                        let targetNextWidth = nextStartWidth - dx;

                        const MIN_COL_WIDTH = 35;
                        if (targetWidth < MIN_COL_WIDTH) {
                            const diff = MIN_COL_WIDTH - targetWidth;
                            targetWidth = MIN_COL_WIDTH;
                            targetNextWidth -= diff;
                        }
                        if (targetNextWidth < MIN_COL_WIDTH) {
                            const diff = MIN_COL_WIDTH - targetNextWidth;
                            targetNextWidth = MIN_COL_WIDTH;
                            targetWidth -= diff;
                        }

                        const currentWidths = [...startWidths];
                        currentWidths[colIndex] = targetWidth;
                        currentWidths[colIndex + 1] = targetNextWidth;

                        const tableSumWidth = currentWidths.reduce((sum, w) => sum + w, 0) || 1;

                        colCells.forEach((c, idx) => {
                            const pctWidth = ((currentWidths[idx] / tableSumWidth) * 100).toFixed(4) + '%';
                            c.style.setProperty('width', pctWidth, 'important');
                            c.style.setProperty('min-width', pctWidth, 'important');
                        });

                        table.style.setProperty('width', '100%', 'important');
                        table.style.setProperty('min-width', '100%', 'important');
                    };

                    const onTouchEnd = () => {
                        resizer.classList.remove('tm-resizing');
                        document.removeEventListener('touchmove', onTouchMove);
                        document.removeEventListener('touchend', onTouchEnd);
                    };

                    document.addEventListener('touchmove', onTouchMove, { passive: true });
                    document.addEventListener('touchend', onTouchEnd);
                }, { passive: true });
            });
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

    /* === UIImprovementsManager & AuraEngine (v6.0) === */
    class UIImprovementsManager {
        constructor() {
            this.targetElement = null;
            this.isExpanded = true;
            this.hasBoundGlobals = false;
        }

        init() {
            this.findTarget();

            // Start an observer to handle delayed mounts and DOM replacements of chat input
            const obs = new MutationObserver(() => {
                // 若目前的目標元素被從 DOM 樹中移除 (SPA 框架重新渲染)，重置並重新尋找
                if (this.targetElement && !this.targetElement.isConnected) {
                    this.targetElement = null;
                    this.isExpanded = true;
                }

                if (!this.targetElement) {
                    this.findTarget();
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });

            this.bindGlobalEvents();
        }

        bindGlobalEvents() {
            if (this.hasBoundGlobals) return;
            this.hasBoundGlobals = true;

            let interactionRAF = null;
            let touchStartY = 0;
            let touchStartX = 0;

            const checkScrollIntent = () => {
                if (!this.targetElement || !this.isExpanded || this.targetElement.contains(document.activeElement)) return;

                // 節流處理頻繁的觸發
                if (interactionRAF) cancelAnimationFrame(interactionRAF);
                interactionRAF = requestAnimationFrame(() => {
                    this.collapse();
                });
            };

            const handleTouchStart = (e) => {
                if (!this.targetElement || !this.isExpanded) return;
                if (e.touches && e.touches.length > 0) {
                    touchStartY = e.touches[0].clientY;
                    touchStartX = e.touches[0].clientX;
                }
            };

            const handleTouchMove = (e) => {
                if (!this.targetElement || !this.isExpanded || this.targetElement.contains(document.activeElement)) return;
                if (!e.touches || e.touches.length === 0) return;

                const touchY = e.touches[0].clientY;
                const touchX = e.touches[0].clientX;
                const deltaY = Math.abs(touchY - touchStartY);
                const deltaX = Math.abs(touchX - touchStartX);

                // 移動端 UX 優化：
                // 1. 若為純水平滑動 (如手勢返回) -> 不干擾
                // 2. 垂直滑動超過 15px -> 視為明確的閱讀/滾動意圖，才觸發縮小
                if (deltaY > 15 && deltaY > deltaX) {
                    // 若在觸控滑動時發現鍵盤是展開的 (通常 document.activeElement 仍為 input)
                    // 此時若使用者滑動對話，我們應該強制 Blur 解面盤，並縮小膠囊，給予最佳的沉浸式閱讀體驗
                    // 工業級防呆：主動釋放焦點
                    if (document.activeElement &&
                        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) {
                        document.activeElement.blur();
                    }
                    checkScrollIntent();
                }
            };

            const handleWheel = (e) => {
                if (!this.targetElement) return;
                // 電腦端 UX 優化：滑鼠滾輪/觸控板滾動超過特定閾值才縮小
                if (Math.abs(e.deltaY) > 5) checkScrollIntent();
            };

            const handleScroll = () => {
                if (!this.targetElement) return;
                // 原生 scroll 捕捉：應對拖曳捲軸、鍵盤上下鍵、PgUp/PgDn 等各種瀏覽器自帶的滾動行為
                checkScrollIntent();
            };

            // 使用 capture: true 強制在事件傳遞的最高層攔截 (無視子元素 stopPropagation)
            window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
            window.addEventListener('wheel', handleWheel, { passive: true, capture: true });
            window.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
            window.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
        }

        findTarget() {
            let el = document.querySelector(CONFIG.UI_AURA.SELECTORS.TARGET);
            if (!el) el = document.querySelector(CONFIG.UI_AURA.SELECTORS.FALLBACK);

            if (el && !this.targetElement) {
                this.targetElement = el;
                log('找到目標面板，開始掛載膠囊 UI');
                this.mount();
                return true;
            }
            return false;
        }

        mount() {
            this.targetElement.classList.add('gemini-ui-smart-container', 'gemini-ui-expanded');

            // 綁定焦點事件 (使用 Event Delegation 架構)
            // 將事件處理器存起來以備之後移除 (若有需要)
            this._focusInHandler = this.handleFocusIn.bind(this);
            this._focusOutHandler = this.handleFocusOut.bind(this);
            this._mouseDownHandler = () => {
                if (!this.isExpanded) {
                    this.expand();
                    // 強制獲得焦點以防立即縮小
                    setTimeout(() => {
                        const input = this.targetElement.querySelector('.ql-editor, [role="textbox"], textarea, rich-textarea');
                        if (input) input.focus();
                    }, 50);
                }
            };

            this.targetElement.addEventListener('focusin', this._focusInHandler);
            this.targetElement.addEventListener('focusout', this._focusOutHandler);
            this.targetElement.addEventListener('mousedown', this._mouseDownHandler);
        }

        handleFocusIn() {
            if (!this.isExpanded) {
                this.expand();
            }
        }

        handleFocusOut(event) {
            // 防呆攔截：確認新的焦點是否依然在容器內部
            if (!this.targetElement.contains(event.relatedTarget)) {
                // 為了避免點擊外部按鈕時的閃爍，給予 50ms 的防抖
                setTimeout(() => {
                    if (!this.targetElement.contains(document.activeElement)) {
                        this.collapse();
                    }
                }, 50);
            }
        }

        expand() {
            this.isExpanded = true;
            this.targetElement.classList.remove('gemini-ui-collapsed');
            this.targetElement.classList.add('gemini-ui-expanded');

            // Allow child content pointer events again
            this.targetElement.querySelectorAll('*').forEach(child => {
                 child.style.pointerEvents = '';
            });
            log('UI 展開 (Active)');
        }

        collapse() {
            // Check if there is text in the input
            const inputEl = this.targetElement.querySelector('.ql-editor');
            if (inputEl && inputEl.textContent.trim().length > 0) return; // do not collapse if it has text

            this.isExpanded = false;
            this.targetElement.classList.remove('gemini-ui-expanded');
            this.targetElement.classList.add('gemini-ui-collapsed');
            log('UI 縮成膠囊 (Collapsed)');
        }
    }

    /* === Private GEMs Manager (v6.0) === */
    class PrivateGEMsManager {
        constructor() {
            this.hasInjected = false;
        }

        init() {
            const observer = new MutationObserver((mutations) => {
                for (let m of mutations) {
                    for (let node of m.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList.contains('mat-mdc-menu-panel') && node.classList.contains('at-mentions-menu')) {
                                this.injectGems(node);
                            } else {
                                const menu = node.querySelector('.mat-mdc-menu-panel.at-mentions-menu, .at-mentions-menu');
                                if (menu) this.injectGems(menu);
                            }
                        }
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        injectGems(menuContainer) {
            if (menuContainer.dataset.gemsInjected) return;
            menuContainer.dataset.gemsInjected = 'true';

            const content = menuContainer.querySelector('.mat-mdc-menu-content') || menuContainer;

            // 等待 Angular 渲染完成
            setTimeout(() => {
                // UI & UX 強化：修改容器最大高度，避免我們的清單被截斷或隱藏
                const pane = menuContainer.closest('.cdk-overlay-pane');
                if (pane) {
                    pane.style.height = 'auto'; // 解除原生限制
                    pane.style.maxHeight = '75vh'; // 給予足夠高度
                }
                menuContainer.style.height = 'auto';
                menuContainer.style.maxHeight = '75vh';
                content.style.maxHeight = '75vh';
                content.style.overflowY = 'auto'; // 開啟捲軸

                // Add header
                const header = document.createElement('div');
                header.textContent = '🔒 Private GEMs (Local)';
                header.style.fontSize = '12px';
                header.style.color = 'var(--text-muted)';
                header.style.padding = '12px 16px 4px 16px';
                header.style.fontWeight = '700';
                header.style.letterSpacing = '0.5px';
                header.style.borderTop = '1px solid var(--border-color)';
                header.style.marginTop = '4px';
                content.appendChild(header);

                CONFIG.CUSTOM_GEMS.forEach(gem => {
                    const btn = document.createElement('button');
                    // 模擬官方行為
                    btn.className = 'mat-mdc-menu-item mat-mdc-focus-indicator';
                    btn.role = 'menuitem';
                    btn.style.display = 'flex';
                    btn.style.alignItems = 'center';
                    btn.style.gap = '12px';
                    btn.style.minHeight = '52px';
                    btn.style.width = '100%';
                    btn.style.background = 'transparent';
                    btn.style.border = 'none';
                    btn.style.cursor = 'pointer';
                    btn.style.padding = '8px 16px';
                    btn.style.transition = 'background 0.2s ease';

                    btn.onmouseenter = () => { btn.style.background = 'var(--bg-tertiary)'; };
                    btn.onmouseleave = () => { btn.style.background = 'transparent'; };

                    btn.innerHTML = `
                        <span style="font-size: 20px; flex-shrink: 0;">${gem.icon}</span>
                        <div style="display: flex; flex-direction: column; text-align: left;">
                            <span style="font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px;">${gem.title}</span>
                            <span style="font-size: 12px; color: var(--text-muted); line-height: 1.2;">${gem.desc}</span>
                        </div>
                    `;

                    // 攔截滑鼠下壓事件，以防原生選單在我們點擊前 blur 消失
                    btn.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    });

                    // 使用 click 作為確認，體驗與原生一致
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // 1. 關閉原生的 Overlay 遮罩
                        const backdrop = document.querySelector('.cdk-overlay-backdrop');
                        if (backdrop) backdrop.click();

                        // 隱藏目前選單
                        const wrapper = menuContainer.closest('.cdk-overlay-container, .cdk-overlay-connected-position-bounding-box');
                        if (wrapper && wrapper.parentElement) {
                            // 提供一個稍微優雅的關閉
                            wrapper.style.display = 'none';
                        }

                        // 2. 準備注入提示詞
                        setTimeout(() => {
                            this.applyGem(gem.prompt);
                        }, 50);
                    });

                    content.appendChild(btn);
                });

                // 強制觸發 Window Resize 向 Angular 廣播重繪，解決版面遮擋
                window.dispatchEvent(new Event('resize'));
            }, 100);
        }

applyGem(promptText) {
            const editor = document.querySelector('.ql-editor');
            if (!editor) return;

            editor.focus();

            // === HPC & 高可靠度：精確選區 `@` 標記清除狀態機 ===
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                let node = range.startContainer;
                let offset = range.startOffset;

                // 邊界防禦：若當前節點非文字節點，嘗試向下探查首個子文字節點
                if (node.nodeType !== Node.TEXT_NODE && node.childNodes.length > 0) {
                    const targetChild = node.childNodes[Math.min(offset, node.childNodes.length - 1)];
                    if (targetChild && targetChild.nodeType === Node.TEXT_NODE) {
                        node = targetChild;
                        offset = node.textContent.length;
                    }
                }

                // O(1) 局部快取回溯法：僅在當前游標附近的文字節點內快速尋找 `@`
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    // 核心算法：從當前光標位置向左搜尋最近的 '@'
                    const atIndex = text.lastIndexOf('@', offset - 1);

                    if (atIndex !== -1) {
                        // 建立原子操作邊界 (Atomic Range Selection)
                        range.setStart(node, atIndex);
                        range.setEnd(node, offset);

                        // 高效記憶體操作：直接執行 V8 引擎優化的刪除，避免全字串重繪
                        range.deleteContents();
                    }
                }
            }

            // 雙重安全降級機制 (Fallback)：若 Selection 狀態被 Angular 強制重置，執行低成本的正則微創手術
            const currentHTML = editor.innerHTML;
            if (currentHTML.includes('@')) {
                // 僅針對光標可能殘留的最末端段落之空 `@` 標記進行 O(1) 替換，絕不全量重繪以免遺失節點結構
                const lastParagraph = editor.lastElementChild;
                if (lastParagraph && lastParagraph.innerHTML.trim() === '@') {
                    lastParagraph.innerHTML = '<br>'; // 維持富文本空行佔位
                }
            }

            // 執行原有的高效文字貼上注入
            this.execInsert(promptText);

            // 如果輸入框是折疊的，強制展開，讓使用者可以看到填入的文字
            const smartContainer = document.querySelector('.gemini-ui-smart-container.gemini-ui-collapsed');
            if (smartContainer) {
                smartContainer.classList.remove('gemini-ui-collapsed');
                smartContainer.classList.add('gemini-ui-expanded');
            }
        }

        execInsert(text) {
            const editor = document.querySelector('.ql-editor');
            if (!editor) return;

            // 工業級文本插入法: 使用 ClipboardEvent 進行原生貼上模擬 (與 Quill 最為相容)
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', text);
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true
            });

            editor.dispatchEvent(pasteEvent);

            if (!pasteEvent.defaultPrevented) {
                // 退回使用 execCommand
                const success = document.execCommand('insertText', false, text);
                if (!success) {
                    log('execCommand fallback for text injection');
                    const textNode = document.createTextNode(text);
                    const sel = window.getSelection();
                    if (sel.rangeCount > 0) {
                        const range = sel.getRangeAt(0);
                        range.insertNode(textNode);
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                }
            }

            // 觸發更新事件
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            editor.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    /* --- § 13. Initialization & MutationObserver --- */
    function init() {
        const browserInfo = CONFIG.IS_IOS ? 'iOS Safari' : CONFIG.IS_CHROME ? 'Chrome' : CONFIG.IS_FIREFOX ? 'Firefox' : 'Unknown';
        log(`🚀 Initializing Gemini Unified v6.0 Industrial UX on ${browserInfo}…`);

        /* === v6.0 Industrial UX: Initialize Enhanced Features === */
        // 1. Reading Progress Bar
        Utils.initReadingProgress();

        // 2. Load persisted state (example: theme preference, collapsed states)
        if (CONFIG.STATE_PERSISTENCE_ENABLED) {
            const savedTheme = Utils.loadState('gemini-theme-preference');
            if (savedTheme) {
                log('✓ Restored saved theme preference:', savedTheme);
            }
        }

        // 3. Initialize Visual Aura Engine & Auto-Collapse Panel
        try {
            const uiManager = new UIImprovementsManager();
            uiManager.init();
        } catch (e) {
            log('Aura Engine initialization failed:', e);
        }

        /* === v6.0 Private GEMs Manager === */
        try {
            const gemsManager = new PrivateGEMsManager();
            gemsManager.init();
            log('✓ Private GEMs Manager initialized.');
        } catch (e) {
            log('Private GEMs initialization failed:', e);
        }

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

        /* === v6.0 Industrial UX: Enhanced Keyboard Navigation === */
        document.addEventListener('keydown', (e) => {
            // Alt+M: Mermaid Live shortcut (existing)
            if (e.altKey && e.code === 'KeyM') {
                e.preventDefault();
                const sel = window.getSelection().toString();
                if (isMermaidCode(sel)) {
                    const encoded = Utils.base64UrlEncode(JSON.stringify({ code: sel, mermaid: { theme: 'dark' } }));
                    if (encoded) {
                        Utils.openUrl(`https://mermaid.live/edit#base64:${encoded}`);
                        Utils.showToast('✓ 快捷鍵啟動 (Alt+M)');
                    }
                }
            }

            // Ctrl+Shift+K: Toggle keyboard navigation highlight
            if (CONFIG.KEYBOARD_NAV_ENABLED && e.ctrlKey && e.shiftKey && e.code === 'KeyK') {
                e.preventDefault();
                const activeElement = document.activeElement;
                if (activeElement) {
                    Utils.highlightForKeyboard(activeElement);
                    Utils.showToast('⌨️ 鍵盤導航高亮');
                }
            }

            // J/K: Scroll through conversation (vim-style)
            if (CONFIG.KEYBOARD_NAV_ENABLED && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (e.code === 'KeyJ') {
                    window.scrollBy({ top: 300, behavior: 'smooth' });
                } else if (e.code === 'KeyK') {
                    window.scrollBy({ top: -300, behavior: 'smooth' });
                }
            }
        });

        /* === v6.0 Industrial UX: Gesture Support (Touch Devices) === */
        if (CONFIG.IS_TOUCH) {
            let touchStartX = 0;
            let touchStartY = 0;

            document.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            document.addEventListener('touchend', (e) => {
                if (!touchStartX || !touchStartY) return;

                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;

                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;

                // Horizontal swipe detection
                if (Math.abs(deltaX) > CONFIG.GESTURE_SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
                    const target = e.target.closest('.tm-action-btn, .gemini-render-button');
                    if (target) {
                        if (deltaX > 0) {
                            target.classList.add('tm-swipe-right');
                        } else {
                            target.classList.add('tm-swipe-left');
                        }
                        setTimeout(() => target.classList.remove('tm-swipe-left', 'tm-swipe-right'), 300);
                    }
                }

                touchStartX = 0;
                touchStartY = 0;
            }, { passive: true });
        }

        /* 頁面卸載：釋放所有 Blob URL */
        window.addEventListener('beforeunload', () => {
            observer.disconnect();
            document.querySelectorAll('[data-blob-url]').forEach(el => {
                if (el.dataset.blobUrl) URL.revokeObjectURL(el.dataset.blobUrl);
            });
            // Save current state before unload
            Utils.saveState('last-visit', Date.now());
        });

        /* 啟動 Banner */
        const platformStr = CONFIG.IS_IOS ? '📱 iOS (Blob)' : CONFIG.IS_CHROME ? '🖥 Chrome' : CONFIG.IS_FIREFOX ? '🦊 Firefox' : '🌐 Other';
        Utils.showToast(`✨ v6.0 Industrial UX 已啟動 (${platformStr})<br>微互動 + 骨架螢幕 + 手勢控制 + 鍵盤導航 + 狀態持久化`, 4000);

        if (CONFIG.DEBUG) {
            console.log(
                '%c🚀 Gemini Unified v6.0 Industrial UX 已啟動',
                'background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 20px; border-radius: 10px; font-weight: bold; font-size: 14px;'
            );
            console.log('平台:', platformStr, '| iOS:', CONFIG.IS_IOS, '| Chrome:', CONFIG.IS_CHROME);
            console.log('v6.0 Features:', {
                microInteractions: true,
                skeletonLoading: CONFIG.SKELETON_ENABLED,
                gestureControl: CONFIG.IS_TOUCH,
                keyboardNav: CONFIG.KEYBOARD_NAV_ENABLED,
                statePersistence: CONFIG.STATE_PERSISTENCE_ENABLED,
                readingProgress: true,
                smartTooltips: true
            });
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