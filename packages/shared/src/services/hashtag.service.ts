/**
 * Hashtag Service
 * 
 * Business logic for hashtags.
 * Platform-agnostic - works on both web and mobile.
 */

import { Hashtag, CreateHashtagRequest } from '../domain/hashtag';

export class HashtagService {
  /**
   * Generate slug from name
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  /**
   * Validate hashtag name
   */
  static validateName(name: string): { valid: boolean; error?: string } {
    if (!name || !name.trim()) {
      return { valid: false, error: 'Hashtag name is required' };
    }

    if (name.length < 2) {
      return { valid: false, error: 'Hashtag name must be at least 2 characters' };
    }

    if (name.length > 50) {
      return { valid: false, error: 'Hashtag name must be 50 characters or less' };
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return { valid: false, error: 'Hashtag name can only contain letters, numbers, spaces, hyphens, and underscores' };
    }

    return { valid: true };
  }

  /**
   * Validate slug
   */
  static validateSlug(slug: string): { valid: boolean; error?: string } {
    if (!slug || !slug.trim()) {
      return { valid: false, error: 'Hashtag slug is required' };
    }

    if (slug.length < 2) {
      return { valid: false, error: 'Hashtag slug must be at least 2 characters' };
    }

    if (slug.length > 50) {
      return { valid: false, error: 'Hashtag slug must be 50 characters or less' };
    }

    // Slug should only contain lowercase letters, numbers, and hyphens
    if (!/^[a-z0-9\-]+$/.test(slug)) {
      return { valid: false, error: 'Hashtag slug can only contain lowercase letters, numbers, and hyphens' };
    }

    return { valid: true };
  }

  /**
   * Validate create hashtag request
   */
  static validateCreateHashtag(request: CreateHashtagRequest): { valid: boolean; error?: string } {
    const nameValidation = this.validateName(request.name);
    if (!nameValidation.valid) {
      return nameValidation;
    }

    if (request.slug) {
      const slugValidation = this.validateSlug(request.slug);
      if (!slugValidation.valid) {
        return slugValidation;
      }
    }

    if (!request.createdBy || !request.createdBy.trim()) {
      return { valid: false, error: 'Created by user ID is required' };
    }

    return { valid: true };
  }

  /**
   * Format hashtag name (capitalize first letter of each word)
   */
  static formatName(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Extract hashtags from text
   */
  static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    if (!matches) return [];
    
    return matches.map(match => match.slice(1).toLowerCase());
  }

  /**
   * Sort hashtags by post count (most popular first)
   */
  static sortByPopularity(hashtags: Hashtag[]): Hashtag[] {
    return [...hashtags].sort((a, b) => {
      const countA = a.postCount || 0;
      const countB = b.postCount || 0;
      return countB - countA;
    });
  }

  /**
   * Sort hashtags by name (alphabetical)
   */
  static sortByName(hashtags: Hashtag[]): Hashtag[] {
    return [...hashtags].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Filter hashtags by search query
   */
  static filterBySearch(hashtags: Hashtag[], query: string): Hashtag[] {
    if (!query || !query.trim()) return hashtags;
    
    const lowerQuery = query.toLowerCase();
    return hashtags.filter(hashtag => 
      hashtag.name.toLowerCase().includes(lowerQuery) ||
      hashtag.slug.toLowerCase().includes(lowerQuery)
    );
  }
}
