// src/utils/network.js
//
// Browsers don't expose a device's LAN IP directly (privacy), so this
// uses the well-known WebRTC ICE-candidate trick: opening a bare
// RTCPeerConnection with no STUN/TURN server causes the browser to
// gather "host" candidates for its own network interfaces, which
// include the private IP. This is a hint for the UI, not a guarantee —
// some browsers/OS combinations report an mDNS ".local" hostname
// instead of a real IP for privacy, in which case this resolves to
// null and the UI should fall back to manual instructions.

const PRIVATE_IPV4 =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})$/;

export function detectLocalNetworkAddress(timeoutMs = 1200) {
  return new Promise((resolve) => {
    if (typeof RTCPeerConnection === 'undefined') {
      resolve(null);
      return;
    }

    let settled = false;
    let pc;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      try {
        pc?.close();
      } catch {
        // ignore
      }
      resolve(value);
    };

    try {
      pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          finish(null);
          return;
        }
        const match = event.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        if (match && PRIVATE_IPV4.test(match[1])) {
          finish(match[1]);
        }
      };

      pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => finish(null));
      window.setTimeout(() => finish(null), timeoutMs);
    } catch {
      finish(null);
    }
  });
}
