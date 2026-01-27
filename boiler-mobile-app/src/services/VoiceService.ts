/**
 * Voice Service - Speech-to-Text and Text-to-Speech
 */
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

export interface VoiceSettings {
    ttsEnabled: boolean;
    language: string;
    pitch: number;
    rate: number;
}

class VoiceService {
    private recording: Audio.Recording | null = null;
    private settings: VoiceSettings = {
        ttsEnabled: true,
        language: 'it-IT',
        pitch: 1.0,
        rate: 1.0,
    };

    /**
     * Request microphone permissions
     */
    async requestPermissions(): Promise<boolean> {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            console.error('Error requesting audio permissions:', error);
            return false;
        }
    }

    /**
     * Start recording audio
     */
    async startRecording(): Promise<void> {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                throw new Error('Microphone permission not granted');
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            this.recording = recording;
            console.log('Recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw error;
        }
    }

    /**
     * Stop recording and get URI
     */
    async stopRecording(): Promise<string | null> {
        try {
            if (!this.recording) {
                return null;
            }

            await this.recording.stopAndUnloadAsync();
            const uri = this.recording.getURI();
            this.recording = null;

            console.log('Recording stopped, URI:', uri);
            return uri;
        } catch (error) {
            console.error('Failed to stop recording:', error);
            return null;
        }
    }

    /**
     * Convert speech to text
     * Note: This is a placeholder. For production, integrate with a real STT service
     * like Google Speech-to-Text, Azure Speech, or Whisper API
     */
    async speechToText(audioUri: string): Promise<string> {
        // TODO: Integrate with actual STT service
        // For now, return a placeholder
        console.warn('STT not implemented. Using placeholder.');
        return 'Imposta temperatura a 21 gradi';
    }

    /**
     * Convert text to speech and play
     */
    async speak(text: string): Promise<void> {
        if (!this.settings.ttsEnabled) {
            return;
        }

        try {
            // Stop any ongoing speech
            await Speech.stop();

            // Speak the text
            await Speech.speak(text, {
                language: this.settings.language,
                pitch: this.settings.pitch,
                rate: this.settings.rate,
            });
        } catch (error) {
            console.error('TTS error:', error);
        }
    }

    /**
     * Stop current speech
     */
    async stopSpeaking(): Promise<void> {
        try {
            await Speech.stop();
        } catch (error) {
            console.error('Error stopping speech:', error);
        }
    }

    /**
     * Check if TTS is available
     */
    async isTTSAvailable(): Promise<boolean> {
        try {
            const available = await Speech.isSpeakingAsync();
            return true; // If no error, TTS is available
        } catch (error) {
            return false;
        }
    }

    /**
     * Update voice settings
     */
    updateSettings(settings: Partial<VoiceSettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    /**
     * Get current settings
     */
    getSettings(): VoiceSettings {
        return { ...this.settings };
    }
}

export const voiceService = new VoiceService();
