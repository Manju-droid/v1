import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioStreamState {
  localStream: MediaStream | null;
  isMuted: boolean;
  volumeLevel: number;
  isPermissionGranted: boolean;
  isPermissionDenied: boolean;
  error: string | null;
}

export interface UseAudioStreamReturn extends AudioStreamState {
  requestMicrophoneAccess: () => Promise<MediaStream | null>;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  stopStream: () => void;
  stopMicrophone: () => void; // Alias for stopStream for clarity
}

export function useAudioStream(): UseAudioStreamReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(true); // Start muted by default
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Request microphone access
  const requestMicrophoneAccess = useCallback(async (): Promise<MediaStream | null> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access');
      }

      console.log('[AudioStream] Requesting microphone permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('[AudioStream] Microphone permission granted');

      // Store stream
      streamRef.current = stream;
      setLocalStream(stream);
      setIsPermissionGranted(true);
      setIsPermissionDenied(false);
      setError(null);

      // Start muted - disable audio tracks
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      setIsMuted(true);

      // Set up audio analysis for volume level
      setupAudioAnalysis(stream);

      return stream;
    } catch (err: any) {
      console.error('[AudioStream] Microphone access error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setIsPermissionDenied(true);
        setError('Microphone access denied');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found');
      } else {
        setError(err.message || 'Failed to access microphone');
      }
      
      return null;
    }
  }, []);

  // Set up audio analysis for volume level indicator
  const setupAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start monitoring volume
      monitorVolume();
    } catch (err) {
      console.warn('[AudioStream] Failed to set up audio analysis:', err);
    }
  }, []);

  // Monitor volume level for visual feedback
  const monitorVolume = useCallback(() => {
    const checkLevel = () => {
      const analyser = analyserRef.current;
      if (!analyser) {
        animationFrameRef.current = requestAnimationFrame(checkLevel);
        return;
      }

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1, avg / 128); // Normalize to 0-1

      setVolumeLevel(normalized);
      animationFrameRef.current = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }, []);

  // Toggle mute state
  const toggleMute = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) {
      console.warn('[AudioStream] No stream to toggle mute');
      return;
    }

    const newMutedState = !isMuted;
    
    stream.getAudioTracks().forEach(track => {
      track.enabled = !newMutedState; // enabled = opposite of muted
    });
    
    setIsMuted(newMutedState);
    console.log('[AudioStream] Mute toggled:', newMutedState ? 'muted' : 'unmuted');
  }, [isMuted]);

  // Set mute state directly
  const setMuted = useCallback((muted: boolean) => {
    const stream = streamRef.current;
    if (!stream) {
      console.warn('[AudioStream] No stream to set mute');
      return;
    }

    stream.getAudioTracks().forEach(track => {
      track.enabled = !muted;
    });
    
    setIsMuted(muted);
    console.log('[AudioStream] Mute set to:', muted ? 'muted' : 'unmuted');
  }, []);

  // Stop stream and cleanup
  const stopStream = useCallback(() => {
    console.log('[AudioStream] Stopping stream and cleaning up...');
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (error) {
        console.warn('[AudioStream] Error closing audio context:', error);
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    // Stop all tracks - this is critical for Safari to release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('[AudioStream] Stopping track:', track.kind, track.id, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
        track.stop();
        // Also set enabled to false for extra safety
        track.enabled = false;
      });
      streamRef.current = null;
    }

    // Also stop any other active media tracks (in case there are any lingering)
    // This is a safety measure for Safari
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // If we can still get a stream, there might be lingering tracks
          stream.getTracks().forEach(track => {
            console.log('[AudioStream] Found lingering track, stopping:', track.id);
            track.stop();
          });
        })
        .catch(() => {
          // If we can't get stream, all tracks are already stopped - that's fine
        });
    }

    setLocalStream(null);
    setVolumeLevel(0);
    setIsPermissionGranted(false);
    setIsMuted(true);
    
    console.log('[AudioStream] ✅ Stream stopped and cleaned up');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Don't stop stream on unmount - let parent component handle that
    };
  }, []);

  // Alias for clarity - stops microphone and cleans up
  const stopMicrophone = useCallback(() => {
    stopStream();
  }, [stopStream]);

  return {
    localStream,
    isMuted,
    volumeLevel,
    isPermissionGranted,
    isPermissionDenied,
    error,
    requestMicrophoneAccess,
    toggleMute,
    setMuted,
    stopStream,
    stopMicrophone,
  };
}

