/**
 * Unit Tests for Post Service
 */
import { describe, it, expect } from 'vitest';
import { PostService } from '../src/services/post.service';
describe('PostService.validateCreatePost', () => {
    it('should validate correct post request', () => {
        const request = {
            authorId: 'user1',
            content: 'This is a test post',
        };
        const result = PostService.validateCreatePost(request);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });
    it('should reject missing authorId', () => {
        const request = {
            authorId: '',
            content: 'Test post',
        };
        const result = PostService.validateCreatePost(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Author ID');
    });
    it('should reject missing content', () => {
        const request = {
            authorId: 'user1',
            content: '',
        };
        const result = PostService.validateCreatePost(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Content');
    });
    it('should reject content too long', () => {
        const request = {
            authorId: 'user1',
            content: 'A'.repeat(501), // POST_MAX_LENGTH is 500
        };
        const result = PostService.validateCreatePost(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('characters or less');
    });
    it('should reject mediaUrl without mediaType', () => {
        const request = {
            authorId: 'user1',
            content: 'Test post',
            mediaUrl: 'https://example.com/image.jpg',
        };
        const result = PostService.validateCreatePost(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Media type');
    });
    it('should reject invalid mediaType', () => {
        const request = {
            authorId: 'user1',
            content: 'Test post',
            mediaUrl: 'https://example.com/file.pdf',
            mediaType: 'pdf',
        };
        const result = PostService.validateCreatePost(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('"image" or "video"');
    });
    it('should accept valid media post', () => {
        const request = {
            authorId: 'user1',
            content: 'Test post',
            mediaUrl: 'https://example.com/image.jpg',
            mediaType: 'image',
        };
        const result = PostService.validateCreatePost(request);
        expect(result.valid).toBe(true);
    });
    it('should reject negative commentLimit', () => {
        const request = {
            authorId: 'user1',
            content: 'Test post',
            commentLimit: -1,
        };
        const result = PostService.validateCreatePost(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('non-negative');
    });
});
describe('PostService.validateCreateComment', () => {
    it('should validate correct comment request', () => {
        const request = {
            postId: 'post1',
            authorId: 'user1',
            content: 'This is a comment',
        };
        const result = PostService.validateCreateComment(request);
        expect(result.valid).toBe(true);
    });
    it('should reject missing postId', () => {
        const request = {
            postId: '',
            authorId: 'user1',
            content: 'Comment',
        };
        const result = PostService.validateCreateComment(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Post ID');
    });
    it('should reject missing authorId', () => {
        const request = {
            postId: 'post1',
            authorId: '',
            content: 'Comment',
        };
        const result = PostService.validateCreateComment(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Author ID');
    });
    it('should reject missing content', () => {
        const request = {
            postId: 'post1',
            authorId: 'user1',
            content: '',
        };
        const result = PostService.validateCreateComment(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Content');
    });
    it('should reject content too long', () => {
        const request = {
            postId: 'post1',
            authorId: 'user1',
            content: 'A'.repeat(1001),
        };
        const result = PostService.validateCreateComment(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('1000 characters');
    });
});
describe('PostService.isVisible', () => {
    it('should return true for VISIBLE status', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isVisible(post)).toBe(true);
    });
    it('should return false for TEMP_HIDDEN status', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            status: 'TEMP_HIDDEN',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isVisible(post)).toBe(false);
    });
    it('should return false for REMOVED status', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            status: 'REMOVED',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isVisible(post)).toBe(false);
    });
});
describe('PostService.isHidden', () => {
    it('should return true for TEMP_HIDDEN', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            status: 'TEMP_HIDDEN',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isHidden(post)).toBe(true);
    });
    it('should return true for REMOVED', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            status: 'REMOVED',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isHidden(post)).toBe(true);
    });
    it('should return false for VISIBLE', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isHidden(post)).toBe(false);
    });
});
describe('PostService.hasMedia', () => {
    it('should return true when mediaUrl and mediaType are present', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            mediaUrl: 'https://example.com/image.jpg',
            mediaType: 'image',
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.hasMedia(post)).toBe(true);
    });
    it('should return false when mediaUrl is missing', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            mediaType: 'image',
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.hasMedia(post)).toBe(false);
    });
    it('should return false when mediaType is missing', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            mediaUrl: 'https://example.com/image.jpg',
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.hasMedia(post)).toBe(false);
    });
});
describe('PostService.areCommentsEnabled', () => {
    it('should return true when commentsDisabled is false', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            commentsDisabled: false,
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.areCommentsEnabled(post)).toBe(true);
    });
    it('should return false when commentsDisabled is true', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            commentsDisabled: true,
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.areCommentsEnabled(post)).toBe(false);
    });
});
describe('PostService.isCommentLimitReached', () => {
    it('should return false when no limit is set', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isCommentLimitReached(post)).toBe(false);
    });
    it('should return false when limit not reached', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            commentLimit: 10,
            commentCount: 5,
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isCommentLimitReached(post)).toBe(false);
    });
    it('should return true when limit is reached', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            commentLimit: 10,
            commentCount: 10,
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isCommentLimitReached(post)).toBe(true);
    });
    it('should return true when limit is exceeded', () => {
        const post = {
            id: 'post1',
            authorId: 'user1',
            content: 'Test',
            commentLimit: 10,
            commentCount: 15,
            status: 'VISIBLE',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(PostService.isCommentLimitReached(post)).toBe(true);
    });
});
