import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function VoiceButton({ text, className = "" }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={speak}
      className={`neumorphic-flat p-2 rounded-lg hover:shadow-md transition-all ${className}`}
      title={isSpeaking ? "Ferma audio" : "Ascolta domanda"}
    >
      {isSpeaking ? (
        <VolumeX className="w-4 h-4 text-orange-600" />
      ) : (
        <Volume2 className="w-4 h-4 text-blue-600" />
      )}
    </button>
  );
}