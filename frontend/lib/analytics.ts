// Analytics utilities for Reach tracking

/**
 * Get or create anonymous user ID for logged-out users
 * Stored in localStorage with 30-day expiry
 */
export function getAnonId(): string {
  if (typeof window === 'undefined') return '';
  
  const key = 'v_anon_id';
  const expiryKey = 'v_anon_id_expiry';
  
  const stored = localStorage.getItem(key);
  const expiry = localStorage.getItem(expiryKey);
  
  // Check if expired (30 days)
  if (stored && expiry) {
    const expiryDate = new Date(expiry);
    if (expiryDate > new Date()) {
      return stored;
    }
  }
  
  // Generate new anonId (UUID-like)
  const newId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 30);
  
  localStorage.setItem(key, newId);
  localStorage.setItem(expiryKey, newExpiry.toISOString());
  
  return newId;
}

/**
 * Get viewport dimensions
 */
export function getViewport(): { w: number; h: number } {
  if (typeof window === 'undefined') return { w: 0, h: 0 };
  return {
    w: window.innerWidth,
    h: window.innerHeight,
  };
}

/**
 * Check if document is visible (not hidden)
 */
export function isDocumentVisible(): boolean {
  if (typeof document === 'undefined') return false;
  return document.visibilityState === 'visible';
}

/**
 * Track reach impression
 */
export async function trackReachImpression(
  postId: string,
  source: 'feed' | 'hashtag' | 'profile' | 'search',
  viewerId?: string | null
): Promise<void> {
  // Don't track if document is hidden
  if (!isDocumentVisible()) return;
  
  const anonId = viewerId ? null : getAnonId();
  const viewport = getViewport();
  
  try {
    const response = await fetch('/api/analytics/impression', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId,
        viewerId: viewerId || null,
        anonId,
        at: new Date().toISOString(),
        viewport,
        source,
        webdriver: (navigator as any).webdriver || false,
      }),
    });
    
    if (!response.ok) {
      console.error('Failed to track reach impression:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to track reach impression:', error);
  }
}

