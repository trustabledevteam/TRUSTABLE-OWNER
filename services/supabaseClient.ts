
import { createClient } from '@supabase/supabase-js';

// Configuration with provided credentials
const SUPABASE_URL = 'https://vjrxtdjbtbjoguuhguee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqcnh0ZGpidGJqb2d1dWhndWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3ODMyOTYsImV4cCI6MjA4MzM1OTI5Nn0.GsN1ThNEvJB_3Rxhzq6CfxAJrtBhPZgh3EImmJJwYuA';

// Initialize the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isBackendConnected = (): boolean => {
  return true;
};
