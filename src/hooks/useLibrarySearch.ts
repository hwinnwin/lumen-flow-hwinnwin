import { useState, useEffect, useCallback, useMemo, ReactNode, createElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Document } from './useDocuments';

// Helper to normalize document principle ID access
const getDocPrincipleId = (doc: Document): string | null => {
  return doc.primary_principle_id ?? doc.linked_principle_id ?? null;
};

interface SearchFilters {
  query: string;
  category: string;
  principleId: string;
  projectId: string;
  tags: string[];
  dateRange: string;
  sortBy: string;
}

export const useLibrarySearch = (documents: Document[] | undefined) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [semanticMode, setSemanticMode] = useState<boolean | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Initialize filters from URL
  const filters: SearchFilters = useMemo(() => ({
    query: searchParams.get('q') || '',
    category: searchParams.get('category') || 'All',
    principleId: searchParams.get('principle') || 'All',
    projectId: searchParams.get('project') || 'All',
    tags: searchParams.get('tags')?.split(',').map(decodeURIComponent).filter(Boolean) || [],
    dateRange: searchParams.get('range') || 'all',
    sortBy: searchParams.get('sort') || 'relevance',
  }), [searchParams]);

  // Detect semantic mode on mount
  useEffect(() => {
    // Default to keyword mode (document_chunks table not yet created)
    // When embeddings are added, this will auto-detect the table
    setSemanticMode(false);
  }, []);

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (key === 'tags') {
      if (value.length > 0) {
        newParams.set('tags', value.map(encodeURIComponent).join(','));
      } else {
        newParams.delete('tags');
      }
    } else if (value && value !== 'All' && value !== 'all' && value !== '') {
      newParams.set(key === 'query' ? 'q' : key, value);
    } else {
      newParams.delete(key === 'query' ? 'q' : key);
    }
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Highlight matches in text - returns ReactNode for safe rendering
  const highlightMatches = useCallback((text: string, query: string): ReactNode => {
    if (!query || !text) return text;
    
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex special chars
    
    if (terms.length === 0) return text;
    
    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) =>
      regex.test(part) 
        ? createElement('mark', { key: i, className: 'bg-primary/20 px-0.5 rounded' }, part)
        : createElement('span', { key: i }, part)
    );
  }, []);

  // Filter and score documents
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    
    let results = documents.filter(doc => {
      // Category filter
      if (filters.category !== 'All' && doc.category !== filters.category) return false;
      
      // Principle filter
      if (filters.principleId !== 'All' && getDocPrincipleId(doc) !== filters.principleId) return false;
      
      // Project filter  
      if (filters.projectId !== 'All' && doc.linked_project_id !== filters.projectId) return false;
      
      // Tags filter
      if (filters.tags.length > 0) {
        const docTags = doc.tags || [];
        const hasAllTags = filters.tags.every(tag => 
          docTags.some(dt => dt.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasAllTags) return false;
      }
      
      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const docDate = new Date(doc.updated_at);
        const daysDiff = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (filters.dateRange === '7' && daysDiff > 7) return false;
        if (filters.dateRange === '14' && daysDiff > 14) return false;
        if (filters.dateRange === '30' && daysDiff > 30) return false;
      }
      
      return true;
    });

    // Text search with scoring
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const terms = query.split(' ').filter(Boolean);
      
      results = results.map(doc => {
        let score = 0;
        const titleLower = doc.title.toLowerCase();
        const summaryLower = (doc.summary || '').toLowerCase();
        const tagsLower = (doc.tags || []).map(t => t.toLowerCase());
        
        // Title matches (highest weight)
        terms.forEach(term => {
          if (titleLower.includes(term)) score += 10;
        });
        
        // Exact title match bonus
        if (titleLower === query) score += 50;
        
        // Summary matches
        terms.forEach(term => {
          const matches = (summaryLower.match(new RegExp(term, 'g')) || []).length;
          score += matches * 5;
        });
        
        // Tag matches
        terms.forEach(term => {
          tagsLower.forEach(tag => {
            if (tag.includes(term)) score += 8;
          });
        });
        
        // Recency bonus
        const daysSinceUpdate = (Date.now() - new Date(doc.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - daysSinceUpdate / 30);
        
        return { ...doc, _searchScore: score };
      }).filter(doc => (doc as any)._searchScore > 0);
    } else {
      results = results.map(doc => ({ ...doc, _searchScore: 50 }));
    }

    // Sort results
    results.sort((a, b) => {
      const aScore = (a as any)._searchScore || 0;
      const bScore = (b as any)._searchScore || 0;
      
      switch (filters.sortBy) {
        case 'relevance':
          return bScore - aScore;
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return bScore - aScore;
      }
    });

    return results;
  }, [documents, filters]);

  // Track search state separately
  useEffect(() => {
    setIsSearching(true);
    const t = setTimeout(() => setIsSearching(false), 120);
    return () => clearTimeout(t);
  }, [filters, documents?.length]);

  return {
    filters,
    updateFilter,
    filteredDocuments,
    semanticMode,
    isSearching,
    highlightMatches,
  };
};
