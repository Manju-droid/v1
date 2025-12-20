'use client';

import React, { useEffect, useRef, memo } from 'react';

interface AudioPlayerProps {
  stream: MediaStream | null;
  userId: string;
  isMuted?: boolean;
  isRemoteMuted?: boolean;
}

/**
 * AudioPlayer component for playing remote audio streams
 * Handles Safari and Chrome compatibility for autoplay
 */
export const AudioPlayer = memo(function AudioPlayer({
  stream,
  userId,
  isMuted = false,
  isRemoteMuted = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastStreamIdRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stream) {
      if (!stream) {
        console.log(`[AudioPlayer] No stream provided for ${userId}`);
      }
      return;
    }

    const audioTracks = stream.getAudioTracks();
    const activeTracks = audioTracks.filter(t => t.enabled && t.readyState === 'live');
    
    console.log(`[AudioPlayer] 🔊 Processing stream for ${userId}`, {
      streamId: stream.id,
      totalTracks: audioTracks.length,
      activeTracks: activeTracks.length,
      trackDetails: audioTracks.map(t => ({
        id: t.id,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
      })),
    });

    // Check if we have active audio tracks
    if (activeTracks.length === 0) {
      console.warn(`[AudioPlayer] ⚠️ No active audio tracks in stream for ${userId}`);
      // Still attach the stream in case tracks become active later
    }

    // Always update srcObject to ensure we have the latest stream
    // Check if stream actually changed to avoid unnecessary updates
    const currentStreamId = stream.id;
    const needsUpdate = currentStreamId !== lastStreamIdRef.current || 
                       audio.srcObject !== stream;
    
    if (needsUpdate) {
      console.log(`[AudioPlayer] Updating audio element for ${userId}`, {
        oldStreamId: lastStreamIdRef.current,
        newStreamId: currentStreamId,
        srcObjectChanged: audio.srcObject !== stream,
      });
      
      lastStreamIdRef.current = currentStreamId;
      
      // Attach stream to audio element
      audio.srcObject = stream;
    }
    
    // Configure audio element - never mute remote audio
    audio.muted = false;
    audio.volume = 1;

    // Monitor track changes
    const handleTrackEnded = () => {
      console.warn(`[AudioPlayer] ⚠️ Audio track ended for ${userId}`);
    };
    
    const handleTrackMute = () => {
      console.warn(`[AudioPlayer] ⚠️ Audio track muted for ${userId}`);
    };
    
    const handleTrackUnmute = () => {
      console.log(`[AudioPlayer] ✅ Audio track unmuted for ${userId}`);
    };

    audioTracks.forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
      track.addEventListener('mute', handleTrackMute);
      track.addEventListener('unmute', handleTrackUnmute);
    });

    // Set up retry mechanism for Safari autoplay restrictions
    let retryIntervalRef: NodeJS.Timeout | null = null;
    const eventListenersRef: Array<{ type: string; handler: () => void }> = [];
    
    // Attempt to play (handle autoplay restrictions)
    const attemptPlay = async () => {
      try {
        // Ensure audio element is ready
        if (audio.readyState < 2) {
          // Wait for audio to be ready
          await new Promise((resolve) => {
            const onCanPlay = () => {
              audio.removeEventListener('canplay', onCanPlay);
              resolve(undefined);
            };
            audio.addEventListener('canplay', onCanPlay);
            // Timeout after 2 seconds
            setTimeout(() => {
              audio.removeEventListener('canplay', onCanPlay);
              resolve(undefined);
            }, 2000);
          });
        }

        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log(`[AudioPlayer] ✅ Playing audio for ${userId}`, {
            currentTime: audio.currentTime,
            paused: audio.paused,
            muted: audio.muted,
            readyState: audio.readyState,
          });
        }
      } catch (err: any) {
        // Autoplay was prevented - this is common in Safari
        console.warn(`[AudioPlayer] ⚠️ Autoplay blocked for ${userId}:`, err.message);
        
        // Set up a more aggressive retry mechanism for Safari
        const cleanupRetry = () => {
          if (retryIntervalRef) {
            clearInterval(retryIntervalRef);
            retryIntervalRef = null;
          }
          eventListenersRef.forEach(({ type, handler, target }: any) => {
            const targetEl = target === 'window' ? window : document;
            targetEl.removeEventListener(type, handler, { capture: true });
          });
          eventListenersRef.length = 0;
        };
        
        const playOnInteraction = () => {
          audio.play()
            .then(() => {
              console.log(`[AudioPlayer] ✅ Audio started playing after user interaction for ${userId}`);
              cleanupRetry();
            })
            .catch((playErr) => {
              console.warn(`[AudioPlayer] Still blocked after interaction for ${userId}:`, playErr);
            });
        };
        
        // Try multiple interaction types - use capture phase for better coverage
        const interactionEvents = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown', 'pointerdown'];
        interactionEvents.forEach(eventType => {
          // Add to both document and window for maximum coverage
          document.addEventListener(eventType, playOnInteraction, { once: true, passive: true, capture: true });
          window.addEventListener(eventType, playOnInteraction, { once: true, passive: true, capture: true });
          eventListenersRef.push({ type: eventType, handler: playOnInteraction });
          eventListenersRef.push({ type: eventType, handler: playOnInteraction });
        });
        
        // Also try to play periodically (Safari sometimes allows this after a delay)
        let retryCount = 0;
        const maxRetries = 10;
        retryIntervalRef = setInterval(() => {
          retryCount++;
          audio.play()
            .then(() => {
              console.log(`[AudioPlayer] ✅ Audio started playing after retry ${retryCount} for ${userId}`);
              cleanupRetry();
            })
            .catch(() => {
              if (retryCount >= maxRetries) {
                cleanupRetry();
                console.warn(`[AudioPlayer] ⚠️ Gave up retrying audio play for ${userId} after ${maxRetries} attempts`);
              }
            });
        }, 500);
      }
    };

    // Small delay to ensure stream is ready, then try to play
    const playTimeout = setTimeout(() => {
      attemptPlay().catch(console.error);
    }, 200);

    // Also try to play when stream tracks become active
    const handleTrackActive = () => {
      if (audio && !audio.paused) return; // Already playing
      // Try to play immediately
      audio.play()
        .then(() => {
          console.log(`[AudioPlayer] ✅ Audio started playing when track became active for ${userId}`);
        })
        .catch((err) => {
          // Silently fail - we'll retry on user interaction
          console.log(`[AudioPlayer] Track became active but play failed for ${userId}, will retry on interaction`);
        });
    };

    // Try to play when stream is attached
    if (audio.srcObject === stream) {
      // Small delay to ensure stream is processed
      setTimeout(() => {
        if (audio.paused && audio.srcObject) {
          audio.play().catch(() => {
            console.log(`[AudioPlayer] Initial play attempt failed for ${userId}, waiting for user interaction`);
          });
        }
      }, 300);
    }

    audioTracks.forEach(track => {
      if (track.readyState === 'live') {
        handleTrackActive();
      }
      // Also listen for when tracks become live
      const handleReadyStateChange = () => {
        if (track.readyState === 'live') {
          handleTrackActive();
        }
      };
      track.addEventListener('ended', handleTrackEnded);
      track.addEventListener('mute', handleTrackMute);
      track.addEventListener('unmute', handleTrackUnmute);
      // Note: readyStateChange event doesn't exist, but we check on track updates
    });

    return () => {
      clearTimeout(playTimeout);
      if (retryIntervalRef) {
        clearInterval(retryIntervalRef);
        retryIntervalRef = null;
      }
      // Clean up event listeners
      eventListenersRef.forEach(({ type, handler, target }: any) => {
        const targetEl = target === 'window' ? window : document;
        targetEl.removeEventListener(type, handler, { capture: true });
      });
      eventListenersRef.length = 0;
      audioTracks.forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
        track.removeEventListener('mute', handleTrackMute);
        track.removeEventListener('unmute', handleTrackUnmute);
      });
    };
  }, [stream, userId, isMuted]);

  // Ensure audio is never muted and try to play on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = false;
      audio.volume = 1;
      
      // Try to play immediately if possible (Safari might allow this after user interaction)
      audio.play().catch(() => {
        // Silently fail - will be handled by the main effect
      });
    }
  }, []);
  
  // Monitor audio element state changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handlePlay = () => {
      console.log(`[AudioPlayer] ✅ Audio started playing for ${userId}`);
    };
    
    const handlePause = () => {
      console.warn(`[AudioPlayer] ⚠️ Audio paused for ${userId}`);
      // Try to resume if it was paused unexpectedly
      if (audio.srcObject && !audio.ended) {
        setTimeout(() => {
          audio.play().catch(() => {});
        }, 100);
      }
    };
    
    const handleEnded = () => {
      console.warn(`[AudioPlayer] ⚠️ Audio ended for ${userId}`);
    };
    
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [userId]);

  // Don't render audio if remote user is muted (they're not sending audio)
  // But still render the element so we can receive audio when they unmute
  
  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ display: 'none' }}
      data-user-id={userId}
      data-remote-muted={isRemoteMuted}
    />
  );
});

export default AudioPlayer;

