import type { Database as SupabaseDatabase } from '../../supabase/types/database.generated';

export type Database = SupabaseDatabase;
export type ProfilesTable = Database['public']['Tables']['profiles'];
export type ProfileRow = ProfilesTable['Row'];
export type ProfileInsert = ProfilesTable['Insert'];
export type ProfileUpdate = ProfilesTable['Update'];
