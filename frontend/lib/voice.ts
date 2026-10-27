/* Browser side of the voice assistant, adapted from the Eloquent demo caller.
   Mic → 16 kHz PCM → socket; 24 kHz PCM ← socket → speaker, queued back to back
   and dropped at once when the worker interrupts.

   By default it talks to this app's /ws/voice. NEXT_PUBLIC_VOICE_WS_URL points it
   at another bridge that speaks the same messages, such as the Azure Eloquent
   bridge in a later round. */

import { Lang, session } from './api';

export type VoiceEvent =
  | { type: 'ready' }
  | { type: 'transcript'; role: 'user' | 'assistant'; text: string }
  | { type: 'action'; name: 'report_hazard' | 'give_feedback'; result: { deadline?: string; assigned_to?: string } }
  | { type: 'error'; message: string }
  | { type: 'closed' };

const OUT_RATE = 24000;

const b64 = (buf: ArrayBuffer) => {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

function socketUrl() {
  const custom = process.env.NEXT_PUBLIC_VOICE_WS_URL;
  if (custom) return custom;
  const { protocol, host } = window.location;
  return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/ws/voice`;
}

export async function startVoice(lang: Lang, onEvent: (e: VoiceEvent) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const micCtx = new AudioContext({ sampleRate: 16000 });
  const outCtx = new AudioContext();
  await micCtx.audioWorklet.addModule('/mic-worklet.js');
  const node = new AudioWorkletNode(micCtx, 'mic-capture');
  micCtx.createMediaStreamSource(stream).connect(node);

  const ws = new WebSocket(socketUrl());
  let playhead = 0;
  let playing: AudioBufferSourceNode[] = [];

  const play = (data: string) => {
    const raw = atob(data);
    const pcm = new Int16Array(raw.length >> 1);
    for (let i = 0; i < pcm.length; i++) pcm[i] = raw.charCodeAt(2 * i) | (raw.charCodeAt(2 * i + 1) << 8);
    const buffer = outCtx.createBuffer(1, pcm.length, OUT_RATE);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
    const src = outCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(outCtx.destination);
    playhead = Math.max(playhead, outCtx.currentTime + 0.03);
    src.start(playhead);
    playhead += buffer.duration;
    playing.push(src);
    src.onended = () => { playing = playing.filter((s) => s !== src); };
  };

  const interrupt = () => {
    playing.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    playing = [];
    playhead = 0;
  };

  // the language on screen right now, so the assistant answers in it
  ws.onopen = () => ws.send(JSON.stringify({ token: session.get(), lang }));
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'audio') play(msg.data);
    else if (msg.type === 'clear') interrupt();
    else onEvent(msg);
  };
  ws.onclose = () => onEvent({ type: 'closed' });

  node.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'audio', data: b64(ev.data) }));
  };

  return () => {
    interrupt();
    ws.close();
    stream.getTracks().forEach((t) => t.stop());
    void micCtx.close();
    void outCtx.close();
  };
}
