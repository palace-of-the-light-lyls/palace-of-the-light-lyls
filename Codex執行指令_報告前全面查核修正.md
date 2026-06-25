# 光之殿堂網站　報告前全面查核修正清單
> 產出日期：2026-05-29　｜　路徑：`claude-site/`
> 本檔供 Codex 直接執行，依序完成「必修 Bug」→「技術整理」→「品質改善」三層。

---

## 一、必修 Bug（會影響使用或顯示錯誤）

### B-1　`script.js` 有三個獨立 `DOMContentLoaded` 監聽器
**問題**：原始程式在第 1 行，後續兩次 append（第 315、507 行）各自又包一個 `DOMContentLoaded`，導致 `setupCarousels()`、`initSdLeadCollapse()` 在首次載入時被呼叫兩次，mutation observer 也被重複綁定兩次。

**修法**：
- 將第 315–505 行（第二個 `DOMContentLoaded` 區塊）的函式定義與呼叫，搬進第一個 `DOMContentLoaded`（行 1）的最後、`showProduct('binfen')` 之前。
- 將第 507–560 行（第三個 `DOMContentLoaded` 區塊，`arch-principle` 折疊）同樣搬進第一個區塊。
- 最終 `script.js` 只保留一個 `DOMContentLoaded`。

---

### B-2　`arch-principle` 設有 `overflow: hidden`，折疊展開後文字被截斷
**問題**：`.arch-principle` CSS 設有 `overflow: hidden`，當 JS 展開摺疊段落（移除 `-webkit-line-clamp`）時，新增高度會被容器截斷，用戶看不到完整文字。

**修法**（`styles.css`）：
```css
/* 手機版展開時臨時解除 overflow */
@media (max-width: 600px) {
  .arch-principle {
    overflow: visible;
  }
}
```

---

### B-3　`section-lead` 在手機版有規則衝突（15px vs 16px）
**問題**：`styles.css` 中存在兩條手機版規則：
- 約第 3090 行：`.section-lead { font-size: 15px; }`
- 約第 3381 行：`.section-lead { font-size: 16px !important; }`

後者用 `!important` 強制覆蓋，雖然最終顯示 16px，但留下衝突冗碼。

**修法**：刪除第 3090 行附近整個 `.section-lead { font-size: 15px; line-height: 1.95; margin-top: 16px; }` 規則，統一由後面的 16px !important 規則管控。

---

### B-4　`series-tabs-wrap::after` 漸層重複定義三次
**問題**：同一個 `::after` 偽元素在以下位置各定義一次：
1. 約第 2779 行（`@media (max-width: 600px)` 內）
2. 約第 3537 行（全域）
3. 約第 3547 行（`@media (max-width: 600px)` 內）

造成樣式計算混亂，且桌機版漸層會遮住最後一個 Tab。

**修法**：保留第 3534–3550 行的定義（新版，有 `z-index: 5` 與 `position: relative`），刪除第 2779 行舊定義。並確認 `series-tabs-wrap` 有 `position: relative`（全域已設定）。

---

### B-5　安藤忠雄頁 `section-lead` 桌機版空白
**問題**：`index.html` 約第 133 行：
```html
<p class="section-lead">
  <span class="mobile-copy">光之殿堂不是單純的紀念建築…</span>
</p>
```
只有 `mobile-copy`，桌機版 `.mobile-copy` 被 `display:none` 隱藏，導致 section-lead 在桌機完全空白，版面出現不必要的空行。

**修法**（`index.html`）：在同一個 `<p>` 內補上 `desktop-copy`：
```html
<p class="section-lead">
  <span class="desktop-copy">光之殿堂以安藤忠雄的建築信念為精神核心，以光、水與自然構築莊重而溫柔的紀念場域。</span>
  <span class="mobile-copy">光之殿堂不是單純的紀念建築，而是一座讓人慢下來、安定下來的場域。安藤忠雄以光、水與自然，為人生最後的重要歸所，留下莊重而溫柔的空間感。</span>
</p>
```

---

### B-6　`sd-grid::before/after` 箭頭與輪播圓點指示器並存，視覺衝突
**問題**：CSS 約第 2977–3017 行，`.sd-grid::before` 顯示 `<`、`::after` 顯示 `>`，是舊版滑動提示；現在已有圓點指示器，兩套並存造成視覺雜亂，且箭頭出現在圓點旁邊比例失調。

**修法**（`styles.css`）：在手機版媒體查詢中加入：
```css
@media (max-width: 600px) {
  .sd-grid::before,
  .sd-grid::after {
    display: none !important;
  }
}
```

---

### B-7　`awaji-media` 輪播初始化時機問題
**問題**：安藤忠雄頁預設 `hidden`，`DOMContentLoaded` 時 `setupCarousels()` 執行，但 `.awaji-media` 的寬度為 0，導致輪播項目的 `88vw` 計算可能異常。mutation observer 雖有補救但依賴 class 切換時機。

**修法**（`script.js`）：在 `setupCarousels()` 內，awaji-media 的初始化改用 `requestAnimationFrame` 延遲，確保 DOM layout 穩定後再執行：
```js
// 在 awaji 的 if 區塊中
if (awaji && !awaji.dataset.carousel) {
    requestAnimationFrame(() => {
        // 原有的 carousel 初始化邏輯
    });
}
```

---

## 二、技術整理（不影響顯示，但清潔程式碼）

### T-1　`script.js` 三個 `DOMContentLoaded` 整合（同 B-1）
合併後結構：
```
DOMContentLoaded (1個)
  ├── DOM refs
  ├── Navigation
  ├── Drawer
  ├── Plan modal (含 pinch-to-zoom)
  ├── Audio
  ├── Scroll / Reveal
  ├── setupCarousels()
  ├── initSdLeadCollapse()
  ├── initArchCollapse()
  ├── re-init mutation observers
  └── Init: showProduct + routeFromHash
```

---

### T-2　CSS 冗餘規則清理
以下規則可刪除：
- 第 3090 行：`.section-lead { font-size: 15px; ... }`（已被 B-3 處理）
- 第 2779 行：舊 `.series-tabs-wrap::after`（已被 B-4 處理）
- CSS 中 `.work-link-label` 定義（HTML 未使用此 class）

---

### T-3　`progress-copy` 平板版仍有 `min-height: 260px`
**問題**：`@media (max-width: 980px)` 下 `.progress-copy { min-height: 260px; }`，平板（601–980px）仍有過多空白。

**修法**：
```css
@media (max-width: 980px) {
  .progress-copy {
    min-height: 0;          /* 由內容決定高度 */
    padding: 28px 24px 36px;
  }
}
```

---

## 三、品質改善（報告品質加分項目）

### Q-1　HTML `<head>` 補強 SEO 與社群分享 meta
**現況**：缺少 description、favicon、Open Graph。

**補充內容**（加在 `<title>` 之後）：
```html
<meta name="description" content="光之殿堂｜世界唯一安藤忠雄設計紀念建築，以光、水、自然與幾何秩序構築莊重而溫柔的人生最後歸所。龍巖股份有限公司。">
<meta property="og:title" content="光之殿堂｜Palace of the Light">
<meta property="og:description" content="以安藤忠雄建築信念為核心，六大主題殿位、自然山林場域。">
<meta property="og:image" content="assets/hero_main.jpg">
<meta property="og:type" content="website">
<meta name="theme-color" content="#f6f3ed">
<link rel="icon" href="assets/favicon.ico" type="image/x-icon">
```
> ⚠️ `favicon.ico` 檔案需另行製作或提供，否則省略 `<link rel="icon">` 那行。

---

### Q-2　`drawer-nav` 補強無障礙屬性
**現況**：drawer 打開後 `aria-hidden="true"` 未切換，商品子項目無 `role`。

**修法**（`script.js`，`openDrawer()` 與 `closeDrawer()`）：
```js
function openDrawer() {
    drawer.classList.add('open');
    drawer.removeAttribute('aria-hidden');    // ← 補這行
    drawerBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');  // ← 補這行
    drawerBackdrop.classList.remove('open');
    document.body.style.overflow = '';
}
```

---

### Q-3　商品 hero 圖片背景色統一
**現況**：各商品 hero 圖使用 `object-fit: contain` 後，背景色統一為 `#f7f5ef`（米白），但不同商品主題色有差異（吉慶金色、光之瀧透明感）。

**修法**（`styles.css`，個別商品）：
```css
@media (max-width: 600px) {
  /* 吉慶：金色底 */
  #prod-jiqing .prod-hero .img-wrap { background: #f5efd6; }
  /* 光之瀧：深色 */
  #prod-water  .prod-hero .img-wrap { background: #1a2530; }
  /* 大觀：木質暖色 */
  #prod-daguan .prod-hero .img-wrap { background: #f0ebe2; }
}
```

---

### Q-4　桃花源（taohua）設計師無人像圖片
**現況**：`#prod-taohua` 的 `.team-card` 中，築內國際的 `tc-content` 無對應 `tc-img`（桌機版欄位空缺），視覺上左欄空白。

**修法**：若無設計師照片，改用品牌板（brand-board）呈現，結構與吉慶大倉陶園相同：
```html
<div class="team-card">
  <div class="tc-content">
    <!-- 現有內容 -->
  </div>
  <div class="brand-board brand-board-light">
    <span>豪宅空間規劃</span>
    <span>誠品信義旗艦店</span>
    <span>誠品京華城</span>
  </div>
</div>
```

---

### Q-5　`plan-modal` pinch-to-zoom 後縮放未重置
**現況**：使用者放大平面圖後，若直接點關閉再開下一張，`transform: scale(N)` 殘留，新圖以放大狀態顯示。

**修法**（`script.js`，`openPlanModal()` 函式）：
```js
function openPlanModal(button) {
    // … 現有程式碼 …
    // 開啟時重置縮放
    if (planModalImage) {
        planModalImage.style.transform = 'scale(1)';
        planModalImage.style.transformOrigin = 'center center';
    }
    planModal.classList.add('open');
}
```

---

### Q-6　首頁三欄 `home-bands` 手機版加圖示提升辨識度
**現況**：手機版三個入口（安藤忠雄／建築特色／商品系列）僅有數字 01/02/03 與文字，對年長用戶辨識度不足。

**建議**：在 `.band-num` 之後加入小圖示：
```html
<!-- 各 home-band 的 band-num 後加 -->
<div class="band-icon" aria-hidden="true">🏛</div>  <!-- 安藤忠雄 -->
<div class="band-icon" aria-hidden="true">✦</div>   <!-- 建築特色 -->
<div class="band-icon" aria-hidden="true">⬡</div>   <!-- 商品系列 -->
```
搭配 CSS 調整 `band-icon { font-size: 22px; color: var(--gold); flex-shrink: 0; }` 即可。

> 若不使用 emoji，改用 SVG icon 或字型圖示。

---

### Q-7　工程進度頁加入「最後更新日期」說明
**現況**：工程進度頁 section-lead 寫「點擊下方入口即可查看最新紀錄」，但未告知用戶網站本身的資料更新時間，對年長用戶可能造成困惑。

**修法**（`index.html`，工程進度 section-kicker 內）：
```html
<p class="section-lead">
  相關進度資訊將依龍巖官網更新內容同步呈現；點擊下方入口即可查看最新紀錄。
  <span style="display:block;margin-top:8px;font-size:13px;color:var(--muted);">
    本頁資料最後更新：2025 年 11 月
  </span>
</p>
```

---

### Q-8　`footer` 補充免責聲明與版本資訊
**現況**：footer-note 文字簡略，建議報告使用版本加入更新時間。

**修法**（`index.html`，`footer-inner` 內）：
```html
<div class="footer-note">
  本網站僅供商品介紹與導覽使用；畫面中部分素材為示意圖，實際內容請以正式文件及專人說明為準。<br>
  © 2025 龍巖股份有限公司　版本 v1.0　最後更新：2025 年 11 月
</div>
```

---

## 執行優先順序建議

| 優先 | 項目 | 預估影響 |
|------|------|---------|
| ⚡ 立即 | B-1 三個 DOMContentLoaded 整合 | JS 重複執行 bug |
| ⚡ 立即 | B-2 arch-principle overflow 修正 | 折疊展開後文字截斷 |
| ⚡ 立即 | B-3 section-lead 字級衝突清理 | CSS 不穩定 |
| ⚡ 立即 | B-4 series-tabs-wrap::after 重複 | CSS 冗碼 |
| ⚡ 立即 | B-5 安藤頁 section-lead 桌機空白 | 桌機版排版破版 |
| ⚡ 立即 | B-6 sd-grid 箭頭移除 | 視覺衝突 |
| 🔧 建議 | Q-2 drawer aria 屬性 | 無障礙 |
| 🔧 建議 | Q-5 modal 縮放重置 | UX bug |
| 🔧 建議 | Q-4 桃花源設計師欄位 | 桌機版空欄 |
| 🔧 建議 | Q-3 hero 背景色統一 | 視覺細節 |
| 📋 報告前 | Q-1 meta / OG tags | SEO + 社群分享 |
| 📋 報告前 | Q-7 工程進度更新日期 | 用戶信任度 |
| 📋 報告前 | Q-8 footer 版本資訊 | 專業度 |

---

*本清單由 Claude Cowork 審查 `index.html`（1178 行）、`styles.css`（3602 行）、`script.js`（560 行）後產出。*
