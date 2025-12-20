// Shared in-memory storage for follow relationships (in real app, use database)
export const followRelations = new Map<string, Set<string>>(); // userId -> Set<followerId>
export const followingRelations = new Map<string, Set<string>>(); // userId -> Set<followingId>
export const followRequests = new Map<string, Set<string>>(); // userId -> Set<requesterId>

