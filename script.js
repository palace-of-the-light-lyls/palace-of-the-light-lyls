document.addEventListener('DOMContentLoaded', () => {

    /* DOM refs */
    const burgerBtn      = document.getElementById('burgerBtn');
    const drawer         = document.getElementById('drawer');
    const drawerClose    = document.getElementById('drawerClose');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const topbar         = document.getElementById('topbar');
    const backToTop      = document.getElementById('backToTop');
    const skipLink       = document.querySelector('.skip-link');
    const mainContent    = document.getElementById('main-content');
    const pages          = new Set(['home', 'ando', 'arch', 'series', 'progress', 'realm']);
    const products       = new Set(['binfen', 'jiqing', 'taohua', 'water', 'daguan', 'city']);
    const planModal      = document.getElementById('planModal');
    const planModalImage = document.getElementById('planModalImage');
    const planModalContent = document.getElementById('planModalContent');
    const planModalTitle = document.getElementById('planModalTitle');
    const preferredScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    let lastPlanTrigger = null;

    /* Copyright-note placement and contrast */
    function sampleImageBrightness(image) {
        if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return null;

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 12;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return null;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const sourceY = Math.floor(image.naturalHeight * 0.65);
        const sourceHeight = Math.max(1, image.naturalHeight - sourceY);

        try {
            context.drawImage(
                image,
                0, sourceY, image.naturalWidth, sourceHeight,
                0, 0, canvas.width, canvas.height
            );
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let luminance = 0;
            for (let index = 0; index < pixels.length; index += 4) {
                luminance +=
                    pixels[index] * 0.2126 +
                    pixels[index + 1] * 0.7152 +
                    pixels[index + 2] * 0.0722;
            }
            return luminance / (pixels.length / 4);
        } catch {
            return null;
        }
    }

    function classifyCopyrightNotes(root = document) {
        const containers = [...root.querySelectorAll('[data-copyright-note]')];

        containers.forEach(container => {
            const nestedInBelowGroup = container.matches(
                '.material-thumbs figure[data-copyright-note], ' +
                '.sd-grid-item.fit [data-copyright-note]'
            );
            const isBelowImage = container.matches(
                '.material-thumbs[data-copyright-note], ' +
                '.sd-grid-item.fit[data-copyright-note], ' +
                '.tc-img[data-copyright-note]'
            );

            container.classList.remove(
                'copyright-overlay',
                'copyright-below',
                'copyright-suppressed',
                'copyright-dark',
                'copyright-light'
            );

            if (nestedInBelowGroup) {
                container.classList.add('copyright-suppressed');
                return;
            }

            if (isBelowImage) {
                container.classList.add('copyright-below', 'copyright-dark');
                return;
            }

            container.classList.add('copyright-overlay', 'copyright-light');
            const image = container.querySelector('img');
            const applyTone = () => {
                const brightness = sampleImageBrightness(image);
                container.classList.toggle('copyright-dark', brightness !== null && brightness >= 165);
                container.classList.toggle('copyright-light', brightness === null || brightness < 165);
            };

            if (image?.complete && image.naturalWidth) applyTone();
            else image?.addEventListener('load', applyTone, { once: true });
        });
    }

    /* Page navigation */
    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
            p.setAttribute('hidden', '');
        });
        const target = document.getElementById('page-' + pageId);
        if (target) {
            target.removeAttribute('hidden');
            target.classList.add('active');
        }
        document.querySelectorAll('.tabs a[data-nav], .drawer-nav a[data-nav]:not([data-product])').forEach(a => {
            const isActive = a.dataset.nav === pageId;
            a.classList.toggle('active', isActive);
            if (isActive) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
        if (pageId !== 'series') {
            document.querySelectorAll('.drawer-nav a[data-product]').forEach(a => a.classList.remove('active'));
        }
        window.scrollTo({ top: 0, behavior: preferredScrollBehavior });
        closeDrawer();
    }

    /* Product tab switching */
    function showProduct(productId) {
        document.querySelectorAll('.product-panel').forEach(p => {
            p.classList.remove('active');
            p.setAttribute('hidden', '');
        });
        const panel = document.getElementById('prod-' + productId);
        if (panel) {
            panel.removeAttribute('hidden');
            panel.classList.add('active');
        }
        document.querySelectorAll('.stab[data-product]').forEach(btn => {
            const isActive = btn.dataset.product === productId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
            btn.tabIndex = isActive ? 0 : -1;
        });
        document.querySelectorAll('.drawer-nav a[data-product]').forEach(a => {
            const seriesIsActive = document.getElementById('page-series')?.classList.contains('active');
            a.classList.toggle('active', seriesIsActive && a.dataset.product === productId);
        });
        const activeTab = document.querySelector('.stab[data-product="' + productId + '"]');
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: preferredScrollBehavior, block: 'nearest', inline: 'center' });
        }
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: preferredScrollBehavior });
        });
    }

    function setRouteHash(pageId, productId) {
        const nextHash = productId ? '#' + pageId + '-' + productId : '#' + pageId;
        if (window.location.hash !== nextHash) {
            history.pushState(null, '', nextHash);
        }
    }

    function navigateTo(pageId, productId) {
        showPage(pageId);
        if (pageId === 'series') showProduct(productId || 'binfen');
        setRouteHash(pageId, productId);
    }

    function routeFromHash() {
        const raw = window.location.hash.replace('#', '').trim();
        if (!raw) {
            showPage('home');
            return true;
        }

        if (raw === 'main-content') {
            if (!document.querySelector('.page.active')) showPage('home');
            requestAnimationFrame(() => mainContent?.focus({ preventScroll: true }));
            return true;
        }

        if (pages.has(raw)) {
            showPage(raw);
            if (raw === 'series') showProduct('binfen');
            return true;
        }

        if (products.has(raw)) {
            showPage('series');
            showProduct(raw);
            return true;
        }

        const seriesMatch = raw.match(/^series-(.+)$/);
        if (seriesMatch && products.has(seriesMatch[1])) {
            showPage('series');
            showProduct(seriesMatch[1]);
            return true;
        }

        history.replaceState(null, '', '#home');
        showPage('home');
        return true;
    }

    /* Drawer */
    function openDrawer() {
        if (drawer)         drawer.classList.add('open');
        if (drawer)         drawer.setAttribute('aria-hidden', 'false');
        if (drawer)         drawer.removeAttribute('inert');
        if (burgerBtn)      burgerBtn.setAttribute('aria-expanded', 'true');
        if (drawerBackdrop) drawerBackdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
        drawerClose?.focus();
    }
    function closeDrawer() {
        if (drawer)         drawer.classList.remove('open');
        if (drawer)         drawer.setAttribute('aria-hidden', 'true');
        if (drawer)         drawer.setAttribute('inert', '');
        if (burgerBtn)      burgerBtn.setAttribute('aria-expanded', 'false');
        if (drawerBackdrop) drawerBackdrop.classList.remove('open');
        document.body.style.overflow = '';
    }

    function safeFocus(element) {
        if (element && typeof element.focus === 'function') {
            element.focus();
        }
    }

    function openPlanModal(button) {
        if (!planModal || !planModalImage) return;
        lastPlanTrigger = button;
        const full = button.dataset.full;
        if (!full) return;
        const title = button.dataset.title || button.querySelector('img')?.alt || '配置圖';
        const preview = button.querySelector('.plan-wrap');
        const shouldClonePreview = !!preview?.querySelector('.space-note');
        if (shouldClonePreview && planModalContent) {
            const clone = preview.cloneNode(true);
            clone.classList.add('plan-modal-preview');
            planModalContent.replaceChildren(clone);
            planModalContent.hidden = false;
            planModalImage.hidden = true;
            planModalImage.removeAttribute('src');
            planModalImage.alt = '';
        } else {
            if (planModalContent) {
                planModalContent.replaceChildren();
                planModalContent.hidden = true;
            }
            planModalImage.hidden = false;
            planModalImage.src = full;
            planModalImage.alt = title;
        }
        if (planModalTitle) planModalTitle.textContent = title;
        // 開啟時重置縮放
        planModalImage.style.transform = 'scale(1)';
        planModalImage.style.transformOrigin = 'center center';
        planModal.dispatchEvent(new CustomEvent('plan-modal-reset'));
        planModal.removeAttribute('inert');
        planModal.classList.add('open');
        planModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            safeFocus(planModal.querySelector('[data-plan-close]') || planModal.querySelector('.plan-modal-panel'));
        });
    }

    function closePlanModal() {
        if (!planModal || !planModalImage) return;
        planModal.classList.remove('open');
        planModal.setAttribute('aria-hidden', 'true');
        planModal.setAttribute('inert', '');
        planModalImage.removeAttribute('src');
        planModalImage.hidden = true;
        if (planModalContent) {
            planModalContent.replaceChildren();
            planModalContent.hidden = true;
        }
        document.body.style.overflow = '';
        safeFocus(lastPlanTrigger);
        lastPlanTrigger = null;
    }

    function keepFocusInside(container, event) {
        const focusable = [...container.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )].filter(el => !el.hidden && el.offsetParent !== null);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function renderPlanMaps() {
        const areas = [
            ['vip',    '1F-10\nVIP 景觀\n155P', 22.07, 5.29, 24.70, 17.26, 31.49, 11.39],
            ['other1', '1F-1\n無瑕\n304P',       2.11, 68.10, 34.19, 21.59, 21.01, 80.35],
            ['binfen', '1F-2\n櫻悅繽紛\n320P',  38.09, 67.91, 29.43, 21.59, 52.70, 80.35],
            ['other3', '1F-3\n雲想\n198P',      69.34, 68.15, 18.03, 21.24, 78.75, 80.35],
            ['jiqing', '1F-6\n吉慶\n165P',      29.17, 37.30, 22.51, 22.14, 41.39, 47.68],
            ['water',  '1F-11\n光之瀧\n155P',  58.83, 5.88, 24.51, 16.79, 75.19, 11.16],
            ['other5', '1F-5\n110P',            63.14, 52.61, 19.88, 13.65, 75.06, 61.30],
            ['other7', '1F-7\n165P',            53.72, 37.50, 22.51, 22.14, 63.83, 47.38],
            ['city',   '1F-8\n光之城\n165P',   29.27, 12.64, 22.51, 22.14, 41.88, 25.04],
            ['taohua', '1F-9\n桃花源\n165P',   53.82, 12.84, 22.51, 22.14, 63.83, 25.00],
            ['other4', '1F-4\n120P',            22.36, 52.88, 19.86, 13.44, 30.59, 61.02],
        ];

        document.querySelectorAll('.plan-map-1f').forEach(map => {
            if (map.dataset.rendered) return;
            const active = ['binfen', 'jiqing', 'taohua', 'water', 'city']
                .find(key => map.classList.contains('plan-highlight-' + key));
            areas.forEach(([key, label, x, y, w, h, lx, ly]) => {
                const area = document.createElement('span');
                area.className = 'map-area' + (key === active ? ' active' : '');
                area.style.left = x + '%';
                area.style.top = y + '%';
                area.style.width = w + '%';
                area.style.height = h + '%';
                map.appendChild(area);

                const text = document.createElement('span');
                text.className = 'map-label';
                text.style.left = lx + '%';
                text.style.top = ly + '%';
                text.textContent = label;
                map.appendChild(text);
            });
            map.dataset.rendered = 'true';
        });

        document.querySelectorAll('.plan-map-2f').forEach(map => {
            if (map.dataset.rendered) return;
            const area = document.createElement('span');
            area.className = 'map-area active';
            area.style.left = '65%';
            area.style.top = '75%';
            area.style.width = '18%';
            area.style.height = '17%';
            map.appendChild(area);

            const text = document.createElement('span');
            text.className = 'map-label';
            text.style.left = '74%';
            text.style.top = '84%';
            text.textContent = '2F-3\n大觀\n208P';
            map.appendChild(text);
            map.dataset.rendered = 'true';
        });
    }

    /* Events */
    if (burgerBtn)      burgerBtn.addEventListener('click', openDrawer);
    if (skipLink && mainContent) {
        skipLink.addEventListener('click', e => {
            e.preventDefault();
            mainContent.focus({ preventScroll: true });
            mainContent.scrollIntoView({ behavior: preferredScrollBehavior, block: 'start' });
        });
    }
    if (drawerClose) {
        drawerClose.addEventListener('click', () => {
            closeDrawer();
            burgerBtn?.focus();
        });
    }
    if (drawerBackdrop) {
        drawerBackdrop.addEventListener('click', () => {
            closeDrawer();
            burgerBtn?.focus();
        });
    }
    planModal?.querySelector('.plan-modal-backdrop')?.addEventListener('click', closePlanModal);
    planModal?.addEventListener('click', e => {
        if (e.target === planModal || e.target?.classList?.contains('plan-modal-backdrop')) {
            closePlanModal();
        }
    });

    document.addEventListener('click', e => {
        const planCard = e.target.closest('.plan-card[data-full]');
        if (planCard) {
            openPlanModal(planCard);
            return;
        }

        if (e.target.closest('[data-plan-close]')) {
            closePlanModal();
            return;
        }

        const navLink = e.target.closest('a[data-nav], button[data-nav]');
        if (navLink) {
            e.preventDefault();
            navigateTo(navLink.dataset.nav, navLink.dataset.product);
            return;
        }
        const stab = e.target.closest('.stab[data-product]');
        if (stab) {
            showProduct(stab.dataset.product);
            setRouteHash('series', stab.dataset.product);
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (planModal?.classList.contains('open')) {
                closePlanModal();
            } else if (drawer?.classList.contains('open')) {
                closeDrawer();
                burgerBtn?.focus();
            }
            return;
        }

        if (e.key === 'Tab') {
            if (planModal?.classList.contains('open')) keepFocusInside(planModal, e);
            else if (drawer?.classList.contains('open')) keepFocusInside(drawer, e);
        }
    });

    document.querySelector('.series-tabs')?.addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        const tabs = [...document.querySelectorAll('.stab[data-product]')];
        const current = tabs.indexOf(document.activeElement);
        if (current < 0) return;

        e.preventDefault();
        let next = current;
        if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
        if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;

        tabs[next].focus();
        showProduct(tabs[next].dataset.product);
        setRouteHash('series', tabs[next].dataset.product);
    });

    /* Topbar scroll shadow */
    if (topbar) {
        window.addEventListener('scroll', () => {
            topbar.classList.toggle('scrolled', window.scrollY > 40);
        });
    }
    if (backToTop) {
        const syncBackToTop = () => {
            backToTop.classList.toggle('visible', window.scrollY > 520);
        };
        window.addEventListener('scroll', syncBackToTop, { passive: true });
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: preferredScrollBehavior });
        });
        syncBackToTop();
    }

    /* Reveal animation */
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.08 });

    function observeReveals() {
        document.querySelectorAll('.reveal:not(.visible)').forEach(el => io.observe(el));
    }
    observeReveals();
    renderPlanMaps();

    const pageObserver = new MutationObserver(observeReveals);
    document.querySelectorAll('.page').forEach(p =>
        pageObserver.observe(p, { attributes: true, attributeFilter: ['class'] })
    );

    window.addEventListener('popstate', routeFromHash);

    /* ── Pinch-to-zoom (plan modal) ─────────────────── */
    (function initPinchZoom() {
        const modal = document.getElementById('planModal');
        const img   = document.getElementById('planModalImage');
        const content = document.getElementById('planModalContent');
        const body = modal?.querySelector('.plan-modal-body');
        if (!modal || !img || !body) return;

        let startDist = 0, startScale = 1, currentScale = 1;
        let offsetX = 0, offsetY = 0;
        let dragStartX = 0, dragStartY = 0, startOffsetX = 0, startOffsetY = 0;
        let pinchStartX = 0, pinchStartY = 0, pinchStartOffsetX = 0, pinchStartOffsetY = 0;
        let isDragging = false;
        let zoomTarget = img;
        const MAX = 4;

        function dist(t) {
            return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
        }

        function resetZoom() {
            currentScale = 1;
            offsetX = 0;
            offsetY = 0;
            isDragging = false;
            [img, content].forEach(el => {
                if (!el) return;
                el.style.transform = 'translate3d(0, 0, 0) scale(1)';
                el.style.transformOrigin = 'center center';
            });
            zoomTarget = getZoomTarget();
        }

        function getZoomTarget() {
            if (content && !content.hidden && content.children.length) return content;
            return img;
        }

        function applyTransform() {
            zoomTarget = getZoomTarget();
            zoomTarget.style.transform = 'translate3d(' + offsetX + 'px, ' + offsetY + 'px, 0) scale(' + currentScale + ')';
        }

        function midpoint(t) {
            return {
                x: (t[0].clientX + t[1].clientX) / 2,
                y: (t[0].clientY + t[1].clientY) / 2
            };
        }

        body.style.touchAction = 'none';
        img.style.touchAction = 'none';
        if (content) content.style.touchAction = 'none';

        body.addEventListener('touchstart', e => {
            zoomTarget = getZoomTarget();
            if (e.touches.length === 2) {
                e.preventDefault();
                isDragging = false;
                startDist  = dist(e.touches);
                startScale = currentScale;
                const mid = midpoint(e.touches);
                pinchStartX = mid.x;
                pinchStartY = mid.y;
                pinchStartOffsetX = offsetX;
                pinchStartOffsetY = offsetY;
                zoomTarget.style.transformOrigin = 'center center';
            } else if (e.touches.length === 1 && currentScale > 1.02) {
                e.preventDefault();
                isDragging = true;
                dragStartX = e.touches[0].clientX;
                dragStartY = e.touches[0].clientY;
                startOffsetX = offsetX;
                startOffsetY = offsetY;
            }
        }, { passive: false });

        body.addEventListener('touchmove', e => {
            if (e.touches.length === 2) {
                e.preventDefault();
                currentScale = Math.min(MAX, Math.max(1, startScale * dist(e.touches) / startDist));
                const mid = midpoint(e.touches);
                offsetX = pinchStartOffsetX + (mid.x - pinchStartX);
                offsetY = pinchStartOffsetY + (mid.y - pinchStartY);
                applyTransform();
            } else if (e.touches.length === 1 && isDragging && currentScale > 1.02) {
                e.preventDefault();
                offsetX = startOffsetX + (e.touches[0].clientX - dragStartX);
                offsetY = startOffsetY + (e.touches[0].clientY - dragStartY);
                applyTransform();
            }
        }, { passive: false });

        body.addEventListener('touchend', () => {
            if (currentScale < 1.08) {
                resetZoom();
            } else {
                isDragging = false;
            }
        });

        modal.addEventListener('plan-modal-reset', resetZoom);

        document.querySelectorAll('[data-plan-close]').forEach(btn => {
            btn.addEventListener('click', resetZoom);
        });
    })();

    /* ── 橫向輪播 + 圓點指示器 ──────────────────────── */
    function makeDots(container, items) {
        if (!container || items.length < 2) return;
        const wrap = document.createElement('div');
        wrap.className = 'carousel-dots';
        items.forEach((_, i) => {
            const d = document.createElement('button');
            d.type = 'button';
            d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            d.setAttribute('aria-label', '第' + (i+1) + '張');
            d.addEventListener('click', () =>
                items[i].scrollIntoView({ behavior: preferredScrollBehavior, block: 'nearest', inline: 'center' })
            );
            wrap.appendChild(d);
        });
        container.insertAdjacentElement('afterend', wrap);

        const dots = wrap.querySelectorAll('.carousel-dot');
        let tick = false;
        container.addEventListener('scroll', () => {
            if (tick) return; tick = true;
            requestAnimationFrame(() => {
                const cRect = container.getBoundingClientRect();
                let best = 0, bestD = Infinity;
                items.forEach((el, i) => {
                    const d = Math.abs(el.getBoundingClientRect().left - cRect.left);
                    if (d < bestD) { bestD = d; best = i; }
                });
                dots.forEach((d, i) => d.classList.toggle('active', i === best));
                tick = false;
            });
        }, { passive: true });
    }

    function setupCarousels() {
        if (window.innerWidth > 600) return;

        /* 淡路夢舞台 */
        const awaji = document.querySelector('.awaji-media');
        if (awaji && !awaji.dataset.carousel) {
            awaji.dataset.carousel = 'pending';
            requestAnimationFrame(() => {
                awaji.dataset.carousel = '1';
                Object.assign(awaji.style, {
                    display:'flex', overflowX:'auto', overflowY:'hidden',
                    scrollSnapType:'x mandatory', scrollbarWidth:'none', gap:'0'
                });
                const imgs = [...awaji.querySelectorAll('.work-img')];
                imgs.forEach(el => {
                    Object.assign(el.style, { flex:'0 0 88vw', maxWidth:'88vw', aspectRatio:'16/10', scrollSnapAlign:'start' });
                    const i = el.querySelector('img');
                    if (i) Object.assign(i.style, { width:'100%', height:'100%', objectFit:'cover' });
                });
                makeDots(awaji, imgs);
            });
        }

        /* 建築特色 sf-grid */
        const sfGrid = document.querySelector('#page-arch .sf-grid');
        if (sfGrid && !sfGrid.dataset.carousel) {
            sfGrid.dataset.carousel = '1';
            Object.assign(sfGrid.style, {
                display:'flex', overflowX:'auto', overflowY:'hidden',
                scrollSnapType:'x mandatory', scrollbarWidth:'none', gap:'0',
                background:'transparent', border:'none'
            });
            const items = [...sfGrid.querySelectorAll('.sf-item')];
            items.forEach(item => {
                Object.assign(item.style, {
                    flex:'0 0 88vw', maxWidth:'88vw', scrollSnapAlign:'start',
                    border:'1px solid var(--line)'
                });
            });
            makeDots(sfGrid, items);
        }
    }

    setupCarousels();

    /* ── sd-lead 展開更多折疊 ────────────────────────── */
    function initSdLeadCollapse() {
        if (window.innerWidth > 600) return;
        document.querySelectorAll('.sd-lead').forEach(lead => {
            if (lead.dataset.collapsed) return;
            requestAnimationFrame(() => {
                const lh = parseFloat(getComputedStyle(lead).lineHeight) || 24;
                if (lead.scrollHeight <= lh * 4.5) return;
                lead.dataset.collapsed = '1';
                lead.classList.add('sd-lead-collapsed');
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'sd-lead-toggle';
                btn.textContent = '展開更多 ↓';
                lead.insertAdjacentElement('afterend', btn);
                let open = false;
                btn.addEventListener('click', () => {
                    open = !open;
                    lead.classList.toggle('sd-lead-collapsed', !open);
                    btn.textContent = open ? '收起 ↑' : '展開更多 ↓';
                });
            });
        });
    }

    initSdLeadCollapse();

    /* ── 建築特色四主題：手機版「了解更多」折疊 ────────── */
    function initArchCollapse() {
        return;

        document.querySelectorAll('.arch-principle').forEach(card => {
            const p = card.querySelector('p');
            if (!p || p.dataset.apInit) return;
            p.dataset.apInit = '1';

            const lh = parseFloat(getComputedStyle(p).lineHeight) || 22;
            const twoLines = lh * 2.6;
            if (p.scrollHeight <= twoLines + 4) return;

            p.classList.add('ap-text-collapsed');

            const btn = document.createElement('button');
            btn.className = 'ap-more-btn';
            btn.textContent = '了解更多 ↓';
            p.insertAdjacentElement('afterend', btn);

            let open = false;
            btn.addEventListener('click', () => {
                open = !open;
                p.classList.toggle('ap-text-collapsed', !open);
                btn.textContent = open ? '收起 ↑' : '了解更多 ↓';
            });
        });
    }

    requestAnimationFrame(initArchCollapse);

    /* ── re-init on page/product switch ─────────────── */
    document.querySelectorAll('.page, .product-panel').forEach(panel => {
        new MutationObserver(() => {
            if (panel.classList.contains('active')) {
                requestAnimationFrame(() => {
                    setupCarousels();
                    initSdLeadCollapse();
                    initArchCollapse();
                    classifyCopyrightNotes(panel);
                });
            }
        }).observe(panel, { attributes: true, attributeFilter: ['class'] });
    });

    /* ── Init ───────────────────────────────────────── */
    let responsiveInitTimer;
    function refreshMobileEnhancements() {
        clearTimeout(responsiveInitTimer);
        responsiveInitTimer = setTimeout(() => {
            setupCarousels();
            initSdLeadCollapse();
            classifyCopyrightNotes();
        }, 120);
    }

    window.addEventListener('resize', refreshMobileEnhancements, { passive: true });
    window.addEventListener('orientationchange', refreshMobileEnhancements, { passive: true });

    classifyCopyrightNotes();
    showProduct('binfen');
    if (!routeFromHash()) showPage('home');

});
