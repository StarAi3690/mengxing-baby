/* ============================================================================
   萌星宝宝 · Service Worker
   策略：保守型「提示式更新（Prompt-based update）」
   ----------------------------------------------------------------------------
   【设计红线 —— 绝不允许因为缓存导致「新版本被挡住 / 模块消失」】
   1. 绝不缓存：HTML 导航、*.html、version.json、接口请求 → 一律直通网络。
      保证任何时刻刷新都能拿到最新页面（不受 SW 缓存影响）。
   2. 绝不缓存：*.js / *.css / HTML / version.json / 接口 → 直通（交给浏览器原生
      HTTP 缓存处理），避免"发版后用户拿到旧代码"这类事故。
   3. 只缓存：图片 / 音频 / 视频 / 字体 / PDF / PPT / wasm 等静态资源 → 缓存优先，
      重复访问零流量（满足"流量消耗最小"）；页面在检测到版本变化时会自动清缓存。
   4. Range 请求（音视频拖动播放）一律直通，绝不命中缓存（半包会导致播放失败）。
   5. 不自作主张更新：install 不调用 skipWaiting；必须由页面弹窗确认后
      发送 message {type:'SKIP_WAITING'} 才激活新版本（提示式更新）。
   6. activate 时清理所有旧版本缓存（"清缓存"语义）。

   兼容性：iPhone / iPad(iOS Safari) · Android · HarmonyOS(ArkWeb) · Windows · macOS
   注意：file:// 双击离线版无法使用 SW（浏览器安全限制），页面侧已做保护性跳过。
   ========================================================================== */
var MX_CACHE = 'mx-assets-v1.0.0';

/* 只缓存「静态资源」；HTML / JS / CSS / version.json / 接口一律直通。
   注意：图片改动后若发现用户仍看到旧图 → 页面侧在版本变化时会自动清一次缓存，
   同时发版请把 MX_CACHE 版本号 +1。 */
var MX_CACHE_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|bmp|avif|mp3|m4a|aac|wav|ogg|oga|mp4|webm|mov|woff2?|ttf|otf|eot|pdf|ppt|pptx|wasm)$/i;

self.addEventListener('install', function (event) {
  /* 提示式更新：不调用 skipWaiting()，保持 waiting 状态，等页面弹窗确认。
     首次安装时无旧 SW 控制，浏览器会自动激活，无需干预。 */
});

self.addEventListener('activate', function (event) {
  event.waitUntil((function () {
    return caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        /* 清理所有 mx- 前缀的旧缓存（保留当前版本） */
        if (k !== MX_CACHE && /^mx-/.test(k)) return caches.delete(k);
        return false;
      }));
    }).catch(function () {}).then(function () {
      return self.clients.claim().catch(function () {});
    });
  })());
});

self.addEventListener('message', function (event) {
  var data = event && event.data;
  if (data && data.type === 'SKIP_WAITING') {
    try { self.skipWaiting(); } catch (e) {}
    return;
  }
  if (data && data.type === 'CLEAR_MX_CACHE') {
    event.waitUntil(caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return /^mx-/.test(k); }).map(function (k) { return caches.delete(k); }));
    }).catch(function () {}));
  }
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (!req || req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  /* 1) 跨域（CloudBase 网关 / COS / 第三方 CDN）→ 直通 */
  if (url.origin !== self.location.origin) return;

  var p = url.pathname;

  /* 2) 绝不缓存的应用入口与接口 */
  if (req.mode === 'navigate') return;                 /* 页面导航 */
  if (/\.html?$/i.test(p)) return;                     /* HTML */
  if (/\/version\.json$/i.test(p)) return;             /* 版本文件 */
  if (/^\/api\//.test(p)) return;                      /* 预留接口前缀 */

  /* 3) Range 请求（音视频拖动）→ 直通，禁止缓存半包 */
  if (req.headers && typeof req.headers.has === 'function' && req.headers.has('range')) return;

  /* 4) 只接管「静态资源」；其余（JS/CSS/HTML/接口）全部直通 */
  if (!MX_CACHE_RE.test(p)) return;

  event.respondWith((function () {
    return caches.open(MX_CACHE).then(function (cache) {
      return cache.match(req).then(function (hit) {
        if (hit) return hit;                            /* 命中缓存：零流量 */
        return fetch(req).then(function (res) {
          /* 只缓存完整成功响应；206/opaque 一律不缓存。
             ⚠️ 必须 await put 完成后再返回：否则 SW 可能在写入完成前被回收，
                导致缓存时灵时不灵（实测踩坑）。 */
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
            return cache.put(req, res.clone()).catch(function () {}).then(function () { return res; });
          }
          return res;
        }).catch(function (err) {
          /* 离线兜底 */
          return cache.match(req).then(function (h2) { if (h2) return h2; throw err; });
        });
      });
    });
  })());
});
