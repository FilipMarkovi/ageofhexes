// server/src/database/db.ts
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws'; 
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false 
  },
  realtime: {
    transport: WebSocket as any 
  }
});