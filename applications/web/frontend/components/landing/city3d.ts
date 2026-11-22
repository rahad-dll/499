/**
 * The 3D city tour (built from `F_B_Landing page` into `public/3d` with
 * `npm run build:citypulse` in that project) and the rule for opening it
 * automatically.
 */

/** Where the built 3D page is served. `/3d` redirects here (next.config.ts). */
export const CITY_3D_URL = "/3d/index.html";

/** localStorage key: "classic" once a visitor chooses the classic page. */
export const LANDING_PREF_KEY = "cp-landing";

/**
 * Runs in <head> on the landing page, before anything paints. It opens the 3D
 * page only when every condition can be confirmed:
 *  - browser: not a bot, no reduced motion or data saver, a real (hardware) WebGL2 GPU;
 *  - device: laptop/desktop (fine pointer, ≥1024 px wide, not a mobile UA) with
 *    8 GB+ memory and 8+ CPU cores;
 *  - network: Wi-Fi/Ethernet, or — where the browser hides the link type, as
 *    desktop Chrome does — a fast 4G-class connection.
 * Safari and Firefox don't expose memory or network info, so they always get
 * the classic page. `/?view=classic` (linked from the 3D page) stays classic
 * and is remembered on this browser.
 */
export const AUTO_3D_SCRIPT = `(function(){try{
if(location.pathname!=="/")return;
var q=new URLSearchParams(location.search),K=${JSON.stringify(LANDING_PREF_KEY)};
if(q.get("view")==="classic"){try{localStorage.setItem(K,"classic")}catch(e){}q.delete("view");var s=q.toString();history.replaceState(null,"",location.pathname+(s?"?"+s:"")+location.hash);return}
try{if(localStorage.getItem(K)==="classic")return}catch(e){return}
var n=navigator,m=function(x){return matchMedia(x).matches};
if(n.webdriver||/bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(n.userAgent))return;
if(m("(prefers-reduced-motion: reduce)")||m("(prefers-reduced-data: reduce)"))return;
if(!m("(pointer: fine) and (hover: hover) and (min-width: 1024px)")||(n.userAgentData&&n.userAgentData.mobile))return;
if(!(n.deviceMemory>=8)||!(n.hardwareConcurrency>=8))return;
var c=n.connection;if(!c||c.saveData)return;
if(c.type){if(c.type!=="wifi"&&c.type!=="ethernet")return}
else if(!(c.effectiveType==="4g"&&c.downlink>=5&&c.rtt<=150))return;
var g=document.createElement("canvas").getContext("webgl2",{failIfMajorPerformanceCaveat:true});if(!g)return;
var d=g.getExtension("WEBGL_debug_renderer_info"),r=d?String(g.getParameter(d.UNMASKED_RENDERER_WEBGL)):"";
var l=g.getExtension("WEBGL_lose_context");if(l)l.loseContext();
if(/swiftshader|llvmpipe|software|basic render/i.test(r))return;
location.replace(${JSON.stringify(CITY_3D_URL)});
}catch(e){}})();`;
