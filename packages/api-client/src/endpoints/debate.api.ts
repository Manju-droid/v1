/**
 * Debate API Client
 *
 * API methods for debate operations.
 */

import { request } from '../client';
import type {
  Debate,
  CreateDebateRequest,
  UpdateDebateRequest,
  JoinDebateRequest,
  UpdateParticipantRequest,
  UpdateSelfMuteRequest,
  AwardWinRequest,
  DebateParticipant,
  SpeakRequest,
  UpdateSpeakRequestRequest,
  DebateListParams,
} from '@v/shared';

/**
 * List debates
 */
export async function listDebates(
  params?: DebateListParams
): Promise<Debate[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const response = await request<any>(
    `/debates${queryParams.toString() ? `?${queryParams}` : ''}`
  );

  // Backend JSON helper wraps response in { success: true, data: { debates: [...], limit: 50, offset: 0 } }
  // Or it might be direct { debates: [...], limit: 50, offset: 0 }
  let data = response;
  if (response && response.data) {
    data = response.data; // Unwrap from Response struct
  }

  let debates: any[] = [];
  if (data && data.debates && Array.isArray(data.debates)) {
    debates = data.debates;
  } else if (Array.isArray(data)) {
    debates = data;
  }

  // Map backend host fields to frontend fields
  return debates.map((debate: any) => {
    if (debate.host) {
      const mappedHost = {
        ...debate.host,
        displayName: debate.host.name || debate.host.Name || debate.host.displayName,
        name: debate.host.name || debate.host.Name || debate.host.displayName,
        handle: debate.host.handle || debate.host.Handle,
        avatar: debate.host.avatarUrl || debate.host.AvatarURL || debate.host.avatar,
      };
      return {
        ...debate,
        host: mappedHost,
      };
    }
    return debate;
  });
}

/**
 * Get debate by ID
 */
export async function getDebate(id: string): Promise<Debate> {
  return request<Debate>(`/debates/${id}`);
}

/**
 * Create debate
 */
export async function createDebate(
  data: CreateDebateRequest
): Promise<Debate> {
  return request<Debate>('/debates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update debate
 */
export async function updateDebate(
  id: string,
  data: UpdateDebateRequest
): Promise<Debate> {
  return request<Debate>(`/debates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete debate
 */
export async function deleteDebate(id: string): Promise<void> {
  return request<void>(`/debates/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Join debate
 */
export async function joinDebate(
  id: string,
  data: JoinDebateRequest
): Promise<void> {
  return request<void>(
    `/debates/${id}/join`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    15000 // 15 second timeout for join requests
  );
}

/**
 * Leave debate
 */
export async function leaveDebate(
  id: string,
  userId: string
): Promise<void> {
  return request<void>(
    `/debates/${id}/leave`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }
  );
}

/**
 * Get debate participants
 */
export async function getDebateParticipants(
  id: string
): Promise<DebateParticipant[]> {
  const data = await request<any>(
    `/debates/${id}/participants`,
    {},
    15000 // 15 second timeout
  );

  if (!Array.isArray(data)) return [];

  // Map backend fields to frontend interface
  return data.map((p: any) => ({
    ...p,
    userId: p.userId || p.id,
    id: p.id,
    displayName: p.displayName || 'User',
    handle: p.handle || p.userId?.substring(0, 8) || 'user',
    avatar: p.avatar || `https://ui-avatars.com/api/?name=${p.userId || p.id || 'U'}&background=random`,
    isHost: false,
    isSpeaking: false,
    hasSwitched: false,
    isSelfMuted: p.isSelfMuted !== undefined ? p.isSelfMuted : true,
    isMutedByHost: p.isMutedByHost !== undefined ? p.isMutedByHost : false,
  }));
}

/**
 * Update participant (host only)
 */
export async function updateParticipant(
  debateId: string,
  data: UpdateParticipantRequest
): Promise<void> {
  return request<void>(`/debates/${debateId}/participants`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Update self mute status
 */
export async function updateSelfMute(
  debateId: string,
  data: UpdateSelfMuteRequest
): Promise<void> {
  return request<void>(`/debates/${debateId}/self-mute`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Create speak request
 */
export async function createSpeakRequest(debateId: string): Promise<SpeakRequest> {
  return request<SpeakRequest>(`/debates/${debateId}/speak-requests`, {
    method: 'POST',
  });
}

/**
 * Get speak requests
 */
export async function getSpeakRequests(debateId: string): Promise<SpeakRequest[]> {
  const data = await request<any>(`/debates/${debateId}/speak-requests`);
  return Array.isArray(data) ? data : [];
}

/**
 * Update speak request (host only)
 */
export async function updateSpeakRequest(
  requestId: string,
  data: UpdateSpeakRequestRequest
): Promise<void> {
  return request<void>(`/debates/speak-requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete speak request
 */
export async function deleteSpeakRequest(requestId: string): Promise<void> {
  return request<void>(`/debates/speak-requests/${requestId}`, {
    method: 'DELETE',
  });
}

/**
 * Get debug participants (for debugging)
 */
export async function getDebugParticipants(debateId: string): Promise<{ debateId: string; participants: DebateParticipant[] }> {
  return request<{ debateId: string; participants: DebateParticipant[] }>(`/debates/${debateId}/debug-participants`);
}

/**
 * Award win (host only)
 */
export async function awardWin(
  debateId: string,
  data: AwardWinRequest
): Promise<void> {
  return request<void>(`/debates/${debateId}/award-win`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Debate API object
 */
export const debateAPI = {
  list: listDebates,
  get: getDebate,
  create: createDebate,
  update: updateDebate,
  delete: deleteDebate,
  join: joinDebate,
  leave: leaveDebate,
  getParticipants: getDebateParticipants,
  getDebugParticipants: getDebugParticipants,
  updateParticipant: updateParticipant,
  updateSelfMute: updateSelfMute,
  createSpeakRequest: createSpeakRequest,
  getSpeakRequests: getSpeakRequests,
  updateSpeakRequest: updateSpeakRequest,
  deleteSpeakRequest: deleteSpeakRequest,
  awardWin: awardWin,
};
