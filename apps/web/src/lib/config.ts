declare global {
  interface Window {
    __BTOW_CONFIG__?: {
      apiUrl: string;
      wsUrl: string;
      livekitUrl: string;
    };
  }
}

export function getApiUrl(): string {
  return (
    window.__BTOW_CONFIG__?.apiUrl ??
    import.meta.env.VITE_API_URL ??
    window.location.origin
  );
}

export function getWsUrl(): string {
  return (
    window.__BTOW_CONFIG__?.wsUrl ??
    import.meta.env.VITE_WS_URL ??
    window.location.origin
  );
}

export function getLivekitUrl(): string {
  return (
    window.__BTOW_CONFIG__?.livekitUrl ??
    import.meta.env.VITE_LIVEKIT_URL ??
    'ws://' + window.location.hostname + ':7880'
  );
}
