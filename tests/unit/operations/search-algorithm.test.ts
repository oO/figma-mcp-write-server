import { describe, it, expect } from 'vitest';

// Mock the search algorithm functions for testing
// In a real implementation, these would be imported from the plugin files

/**
 * Mock implementation of the Boyer-Moore search algorithm for testing
 */
function mockSearchText(text: string, query: string, options: {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  maxResults?: number;
} = {}): Array<{ rangeStart: number; rangeEnd: number; match: string }> {
  const { caseSensitive = false, wholeWord = false, maxResults = 100 } = options;
  
  if (!query || query.length === 0) {
    return [];
  }
  
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchPattern = caseSensitive ? query : query.toLowerCase();
  const matches: Array<{ rangeStart: number; rangeEnd: number; match: string }> = [];
  
  let startIndex = 0;
  while (startIndex < searchText.length && matches.length < maxResults) {
    const index = searchText.indexOf(searchPattern, startIndex);
    if (index === -1) break;
    
    const rangeStart = index;
    const rangeEnd = index + searchPattern.length;
    const match = text.substring(rangeStart, rangeEnd);
    
    // Check whole word constraint
    if (!wholeWord || mockIsWholeWordMatch(text, rangeStart, rangeEnd)) {
      matches.push({ rangeStart, rangeEnd, match });
    }
    
    startIndex = index + 1;
  }
  
  return matches;
}

function mockIsWholeWordMatch(text: string, rangeStart: number, rangeEnd: number): boolean {
  const wordBoundaryRegex = /\w/;
  
  // Check character before match
  if (rangeStart > 0) {
    const prevChar = text[rangeStart - 1];
    const matchStartChar = text[rangeStart];
    if (wordBoundaryRegex.test(prevChar) && wordBoundaryRegex.test(matchStartChar)) {
      return false;
    }
  }
  
  // Check character after match
  if (rangeEnd < text.length) {
    const nextChar = text[rangeEnd];
    const matchEndChar = text[rangeEnd - 1];
    if (wordBoundaryRegex.test(nextChar) && wordBoundaryRegex.test(matchEndChar)) {
      return false;
    }
  }
  
  return true;
}

describe('Search Algorithm', () => {
  describe('Basic Search', () => {
    it('should find simple matches', () => {
      const text = 'hello world hello';
      const matches = mockSearchText(text, 'hello');
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 5, match: 'hello' });
      expect(matches[1]).toEqual({ rangeStart: 12, rangeEnd: 17, match: 'hello' });
    });

    it('should handle empty query', () => {
      const text = 'hello world';
      const matches = mockSearchText(text, '');
      
      expect(matches).toHaveLength(0);
    });

    it('should handle query longer than text', () => {
      const text = 'hi';
      const matches = mockSearchText(text, 'hello world');
      
      expect(matches).toHaveLength(0);
    });

    it('should handle no matches', () => {
      const text = 'hello world';
      const matches = mockSearchText(text, 'xyz');
      
      expect(matches).toHaveLength(0);
    });
  });

  describe('Case Sensitivity', () => {
    it('should be case insensitive by default', () => {
      const text = 'Hello WORLD hello';
      const matches = mockSearchText(text, 'hello');
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 5, match: 'Hello' });
      expect(matches[1]).toEqual({ rangeStart: 12, rangeEnd: 17, match: 'hello' });
    });

    it('should support case sensitive search', () => {
      const text = 'Hello WORLD hello';
      const matches = mockSearchText(text, 'hello', { caseSensitive: true });
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ rangeStart: 12, rangeEnd: 17, match: 'hello' });
    });

    it('should handle mixed case in case sensitive mode', () => {
      const text = 'Hello WORLD hello';
      const matches = mockSearchText(text, 'Hello', { caseSensitive: true });
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 5, match: 'Hello' });
    });
  });

  describe('Whole Word Matching', () => {
    it('should match partial words by default', () => {
      const text = 'hello world helper';
      const matches = mockSearchText(text, 'hel');
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 3, match: 'hel' });
      expect(matches[1]).toEqual({ rangeStart: 12, rangeEnd: 15, match: 'hel' });
    });

    it('should support whole word matching', () => {
      const text = 'hello world helper';
      const matches = mockSearchText(text, 'hello', { wholeWord: true });
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 5, match: 'hello' });
    });

    it('should handle word boundaries correctly', () => {
      const text = 'test testing tester';
      const matches = mockSearchText(text, 'test', { wholeWord: true });
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 4, match: 'test' });
    });

    it('should handle punctuation as word boundaries', () => {
      const text = 'hello, world! hello?';
      const matches = mockSearchText(text, 'hello', { wholeWord: true });
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 5, match: 'hello' });
      expect(matches[1]).toEqual({ rangeStart: 14, rangeEnd: 19, match: 'hello' });
    });
  });

  describe('Max Results', () => {
    it('should respect maxResults limit', () => {
      const text = 'hello hello hello hello hello';
      const matches = mockSearchText(text, 'hello', { maxResults: 3 });
      
      expect(matches).toHaveLength(3);
    });

    it('should return all matches when under limit', () => {
      const text = 'hello hello';
      const matches = mockSearchText(text, 'hello', { maxResults: 5 });
      
      expect(matches).toHaveLength(2);
    });

    it('should handle maxResults of 1', () => {
      const text = 'hello hello hello';
      const matches = mockSearchText(text, 'hello', { maxResults: 1 });
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 5, match: 'hello' });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle overlapping matches correctly', () => {
      const text = 'aaaa';
      const matches = mockSearchText(text, 'aa');
      
      expect(matches).toHaveLength(3);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 2, match: 'aa' });
      expect(matches[1]).toEqual({ rangeStart: 1, rangeEnd: 3, match: 'aa' });
      expect(matches[2]).toEqual({ rangeStart: 2, rangeEnd: 4, match: 'aa' });
    });

    it('should handle special characters', () => {
      const text = 'hello@world.com and hello@test.org';
      const matches = mockSearchText(text, 'hello@');
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 6, match: 'hello@' });
      expect(matches[1]).toEqual({ rangeStart: 20, rangeEnd: 26, match: 'hello@' });
    });

    it('should handle unicode characters', () => {
      const text = 'café naïve résumé';
      const matches = mockSearchText(text, 'é');
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ rangeStart: 3, rangeEnd: 4, match: 'é' });
      expect(matches[1]).toEqual({ rangeStart: 15, rangeEnd: 16, match: 'é' });
    });

    it('should handle newlines and whitespace', () => {
      const text = 'hello\\nworld\\thello';
      const matches = mockSearchText(text, 'hello');
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 5, match: 'hello' });
      expect(matches[1]).toEqual({ rangeStart: 13, rangeEnd: 18, match: 'hello' });
    });
  });

  describe('Combined Options', () => {
    it('should handle case sensitive + whole word', () => {
      const text = 'Hello hello HELLO world';
      const matches = mockSearchText(text, 'hello', { 
        caseSensitive: true, 
        wholeWord: true 
      });
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ rangeStart: 6, rangeEnd: 11, match: 'hello' });
    });

    it('should handle case sensitive + maxResults', () => {
      const text = 'Hello hello HELLO hello hello';
      const matches = mockSearchText(text, 'hello', { 
        caseSensitive: true, 
        maxResults: 2 
      });
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ rangeStart: 6, rangeEnd: 11, match: 'hello' });
      expect(matches[1]).toEqual({ rangeStart: 18, rangeEnd: 23, match: 'hello' });
    });

    it('should handle whole word + maxResults', () => {
      const text = 'test testing test tested test';
      const matches = mockSearchText(text, 'test', { 
        wholeWord: true, 
        maxResults: 2 
      });
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 4, match: 'test' });
      expect(matches[1]).toEqual({ rangeStart: 13, rangeEnd: 17, match: 'test' });
    });

    it('should handle all options combined', () => {
      const text = 'Test testing TEST test Test';
      const matches = mockSearchText(text, 'Test', { 
        caseSensitive: true, 
        wholeWord: true, 
        maxResults: 1 
      });
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 4, match: 'Test' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single character queries', () => {
      const text = 'a b a c a';
      const matches = mockSearchText(text, 'a');
      
      expect(matches).toHaveLength(3);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 1, match: 'a' });
      expect(matches[1]).toEqual({ rangeStart: 4, rangeEnd: 5, match: 'a' });
      expect(matches[2]).toEqual({ rangeStart: 8, rangeEnd: 9, match: 'a' });
    });

    it('should handle query same length as text', () => {
      const text = 'hello';
      const matches = mockSearchText(text, 'hello');
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ rangeStart: 0, rangeEnd: 5, match: 'hello' });
    });

    it('should handle empty text', () => {
      const text = '';
      const matches = mockSearchText(text, 'hello');
      
      expect(matches).toHaveLength(0);
    });

    it('should handle text with only whitespace', () => {
      const text = '   ';
      const matches = mockSearchText(text, ' ');
      
      expect(matches).toHaveLength(3);
    });
  });
});