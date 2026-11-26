import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#03050A', color: '#F4F6FF', position: 'relative', overflow: 'hidden', padding: 76, flexDirection: 'column', justifyContent: 'center' }}>
    <div style={{ display: 'flex', position: 'absolute', width: 610, height: 610, right: -160, top: 52, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #557B9B, #132C47 48%, #03050A 74%)', border: '1px solid #8CAEFF' }} />
    <div style={{ display: 'flex', color: '#E8C88C', fontSize: 18, letterSpacing: 6, marginBottom: 25 }}>AN ATLAS OF ONE DAY</div>
    <div style={{ display: 'flex', fontSize: 112, fontWeight: 700, lineHeight: .93, letterSpacing: -6 }}>STELLAR<br />ORIGIN</div>
    <div style={{ display: 'flex', fontSize: 27, color: '#E8C88C', marginTop: 40 }}>Your birth. Your moment. Your universe.</div>
  </div>, size);
}
