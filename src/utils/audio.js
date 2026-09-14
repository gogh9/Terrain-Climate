// Web Audio API Sound Generator & Web Speech API TTS helper

class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  initCtx() {}

  playClick() {}

  playSuccess() {}

  playFanfare() {}
}

export const sound = new SoundEngine();

export const speakText = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.95; // Friendly reading speed for 6th grade
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

export const stopSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
