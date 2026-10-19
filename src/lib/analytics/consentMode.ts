import "./dataLayer";
import { isCampaignEvent } from "./events";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  CONSENT_RETENTION,
  type ConsentChoice,
  type ConsentPreferences,
} from "@/lib/consent";

/**
 * Consent Mode defaults for a future GTM load. This does not load gtag.js,
 * gtm.js, or the Meta pixel. The container stays off while
 * `NEXT_PUBLIC_GTM_ID` is empty.
 *
 * The default is denied, then a valid `rrb_silver_consent` cookie is applied
 * with one consent update. A later choice on the open page is another update.
 * Earlier campaign events are left where they were and are not pushed again.
 *
 * F.2B-2 section 4.5 item 5.
 */
export const CONSENT_WAIT_FOR_UPDATE_MS = 500;

export const CONSENT_SIGNALS = {
  analytics: "rrb_analytics_storage",
  adStorage: "rrb_ad_storage",
  adUserData: "rrb_ad_user_data",
  adPersonalization: "rrb_ad_personalization",
} as const;

export type GoogleConsentState = {
  analytics_storage: ConsentChoice;
  ad_storage: ConsentChoice;
  ad_user_data: ConsentChoice;
  ad_personalization: ConsentChoice;
};

export const DENIED_GOOGLE_CONSENT: GoogleConsentState = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

export function googleConsentFromPreferences(preferences: ConsentPreferences): GoogleConsentState {
  return {
    analytics_storage: preferences.analytics,
    ad_storage: preferences.advertising,
    ad_user_data: preferences.advertising,
    ad_personalization: preferences.advertising,
  };
}

export function consentStateKey(state: GoogleConsentState): string {
  return [
    state.analytics_storage,
    state.ad_storage,
    state.ad_user_data,
    state.ad_personalization,
  ].join("|");
}

export function consentSignal(state: GoogleConsentState): Record<string, ConsentChoice> {
  return {
    [CONSENT_SIGNALS.analytics]: state.analytics_storage,
    [CONSENT_SIGNALS.adStorage]: state.ad_storage,
    [CONSENT_SIGNALS.adUserData]: state.ad_user_data,
    [CONSENT_SIGNALS.adPersonalization]: state.ad_personalization,
  };
}

/**
 * Inline bootstrap. `beforeInteractive` in the root layout runs it before
 * Next.js and before the afterInteractive GTM loader. Cookie values are read
 * at runtime and are not interpolated into this source.
 */
export function consentBootstrapSource(): string {
  const maxAgeMs = CONSENT_RETENTION.maxAgeSeconds * 1000;
  return `(function(){
var w=window;
w.dataLayer=w.dataLayer||[];
if(typeof w.gtag!=="function"){w.gtag=function(){w.dataLayer.push(arguments);};}
if(w.__rrbConsentDefaultSet)return;
w.__rrbConsentDefaultSet=true;
var denied={analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"};
w.gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",wait_for_update:${CONSENT_WAIT_FOR_UPDATE_MS}});
var stored=readStored();
var state=stored?{analytics_storage:stored.analytics,ad_storage:stored.advertising,ad_user_data:stored.advertising,ad_personalization:stored.advertising}:denied;
if(stored)w.gtag("consent","update",state);
w.dataLayer.push({${CONSENT_SIGNALS.analytics}:state.analytics_storage,${CONSENT_SIGNALS.adStorage}:state.ad_storage,${CONSENT_SIGNALS.adUserData}:state.ad_user_data,${CONSENT_SIGNALS.adPersonalization}:state.ad_personalization});
w.__rrbConsentApplied=[state.analytics_storage,state.ad_storage,state.ad_user_data,state.ad_personalization].join("|");
function readStored(){
var raw=null;
var parts=(document.cookie||"").split(";");
for(var i=0;i<parts.length;i++){
var trimmed=parts[i].replace(/^\\s+/,"");
var eq=trimmed.indexOf("=");
if(eq===-1)continue;
if(trimmed.slice(0,eq)!==${JSON.stringify(CONSENT_COOKIE_NAME)})continue;
raw=trimmed.slice(eq+1);
break;
}
if(!raw)return null;
var candidates=[raw];
try{
var decoded=decodeURIComponent(raw);
if(decoded!==raw)candidates.push(decoded);
}catch(e){return null;}
var pattern=/^v(\\d+)\\.analytics\\.(granted|denied)\\.advertising\\.(granted|denied)\\.t\\.(\\d{1,16})$/;
for(var c=0;c<candidates.length;c++){
var match=pattern.exec(candidates[c]);
if(!match)continue;
var version=Number(match[1]);
var chosenAt=Number(match[4]);
if(version!==${CONSENT_COOKIE_VERSION})return null;
if(!Number.isSafeInteger(chosenAt)||chosenAt<0)return null;
var age=Date.now()-chosenAt;
if(age<0)return {analytics:match[2],advertising:match[3]};
if(age>${maxAgeMs})return null;
return {analytics:match[2],advertising:match[3]};
}
return null;
}
})();`;
}

/** Runs the bootstrap once. A second call does not push another default. */
export function runConsentBootstrap(): void {
  if (typeof window === "undefined" || window.__rrbConsentDefaultSet) return;
  const execute = new Function(consentBootstrapSource());
  execute();
}

function isCampaignDataLayerEvent(entry: unknown): boolean {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  return isCampaignEvent((entry as { event?: unknown }).event);
}

/**
 * Consent update for a choice saved on the open page. Does not reload, does
 * not push campaign events again, and drops campaign events appended as a
 * side effect of the update.
 */
export function applyOpenPageConsent(preferences: ConsentPreferences): void {
  if (typeof window === "undefined") return;
  runConsentBootstrap();
  const state = googleConsentFromPreferences(preferences);
  const key = consentStateKey(state);
  if (window.__rrbConsentApplied === key) return;

  const layer = (window.dataLayer ??= []);
  const mark = layer.length;
  window.gtag?.("consent", "update", state);
  layer.push(consentSignal(state));
  window.__rrbConsentApplied = key;

  for (let index = layer.length - 1; index >= mark; index -= 1) {
    if (isCampaignDataLayerEvent(layer[index])) layer.splice(index, 1);
  }
}
