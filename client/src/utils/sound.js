/**
 * Sound utility untuk memutar bunyi "bip" pakai Web Audio API.
 * Tanpa file audio eksternal.
 */

// AudioContext di-level module agar bisa di-reuse
let audioCtx = null

/** Pastikan AudioContext tersedia dan tidak dalam state suspended */
function ensureCtx() {
  if (audioCtx === null) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Mainkan beep dengan frekuensi dan durasi tertentu.
 * @param {number} frequency - Frekuensi dalam Hz
 * @param {number} duration - Durasi dalam milidetik
 */
function playBeep(frequency, duration) {
  const ctx = ensureCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = frequency
  gain.gain.value = 0.2

  osc.connect(gain)
  gain.connect(ctx.destination)

  const now = ctx.currentTime
  osc.start(now)
  osc.stop(now + duration / 1000)

  // Cleanup setelah selesai diputar
  osc.onended = () => {
    osc.disconnect()
    gain.disconnect()
  }
}

/** Bunyi bip pendek untuk scan berhasil (1200 Hz, 100ms) */
export function playSuccess() {
  playBeep(1200, 100)
}

/** Bunyi bip panjang untuk scan gagal (400 Hz, 200ms) */
export function playError() {
  playBeep(400, 200)
}
