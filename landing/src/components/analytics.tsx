'use client';

import Script from 'next/script';

/**
 * Privacy-friendly analytics. No cookies, minimal data.
 * Set env in .env.local (see landing/README.md or docs):
 * - GoatCounter: NEXT_PUBLIC_ANALYTICS_PROVIDER=goatcounter, NEXT_PUBLIC_GOATCOUNTER_CODE=your-code
 * - Plausible: NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible, NEXT_PUBLIC_ANALYTICS_DOMAIN=confidant.one
 * - Cloudflare: NEXT_PUBLIC_ANALYTICS_PROVIDER=cloudflare, NEXT_PUBLIC_CF_BEACON_TOKEN=your-token
 */
export function Analytics() {
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  const cfToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  const goatCounterCode = process.env.NEXT_PUBLIC_GOATCOUNTER_CODE;

  if (provider === 'goatcounter' && goatCounterCode) {
    return (
      <Script
        data-goatcounter={`https://${goatCounterCode}.goatcounter.com/count`}
        src="https://gc.zgo.at/count.js"
        strategy="afterInteractive"
        async
      />
    );
  }

  if (provider === 'plausible' && domain) {
    return (
      <Script
        defer
        data-domain={domain}
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
    );
  }

  if (provider === 'cloudflare' && cfToken) {
    return (
      <Script
        defer
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon={JSON.stringify({ token: cfToken })}
        strategy="afterInteractive"
      />
    );
  }

  return null;
}
