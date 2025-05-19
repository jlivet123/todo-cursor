import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../supabase';
import { AlterEgoCategory } from '../types';

const DEFAULT_CATEGORIES = [
  'Leaders',
  'Thinkers',
  'Artists',
  'Scientists',
  'Entrepreneurs',
];

export async function renameAlterEgoCategory(userId: string, categoryId: string, newName: string) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client is not initialized")

  const { data, error } = await supabase
    .from("alter_ego_categories")
    .update({ name: newName })
    .eq("id", categoryId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    console.error("Failed to rename category", error)
    return null
  }

  return data
}

export async function ensureDefaultAlterEgoCategories(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  // Check existing categories
  const { data: existingCategories } = await supabase
    .from('alter_ego_categories')
    .select('name')
    .eq('user_id', userId);

  const existingNames = new Set(existingCategories?.map(c => c.name) || []);
  
  // Filter out categories that already exist
  const categoriesToCreate = DEFAULT_CATEGORIES.filter(name => !existingNames.has(name))
    .map((name, index) => ({
      id: uuidv4(),
      name,
      description: null,
      position: existingCategories?.length || 0 + index + 1,
      user_id: userId,
      created_at: new Date().toISOString()
    }));

  if (categoriesToCreate.length > 0) {
    await supabase
      .from('alter_ego_categories')
      .insert(categoriesToCreate);
  }
}

export async function fetchAlterEgoCategories(userId: string): Promise<AlterEgoCategory[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  let dbCategories = await supabase
    .from('alter_ego_categories')
    .select('*')
    .eq('user_id', userId)
    .order('position')
    .then(({ data }) => data || []);

  if (dbCategories.length === 0) {
    await ensureDefaultAlterEgoCategories(userId);
    dbCategories = await supabase
      .from('alter_ego_categories')
      .select('*')
      .eq('user_id', userId)
      .order('position')
      .then(({ data }) => data || []);
  }

  // Prepend the virtual "All" category
  const allCategory: AlterEgoCategory = {
    id: 'all',
    name: 'All',
    description: null,
    position: 0,
    user_id: userId,
    created_at: new Date().toISOString()
  };

  return [allCategory, ...dbCategories];
}

export async function createAlterEgoCategory(
  userId: string, 
  name: string
): Promise<AlterEgoCategory | null> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  // Get the highest position
  const { data: maxPositionResult } = await supabase
    .from('alter_ego_categories')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = (maxPositionResult?.[0]?.position || 0) + 1;

  const newCategory: Omit<AlterEgoCategory, 'id'> = {
    name,
    description: null,
    position: nextPosition,
    user_id: userId,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('alter_ego_categories')
    .insert([newCategory])
    .select()
    .single();

  if (error) {
    // Log the full error object for debugging
    console.error('Full Supabase error:', JSON.stringify(error, null, 2));
    
    // Log structured error info
    const errorInfo = {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      name: error.name
    };
    console.error('Error creating alter ego category:', JSON.stringify(errorInfo, null, 2));

    // Also log the category data we tried to insert
    console.error('Category data that failed:', JSON.stringify(newCategory, null, 2));
    return null;
  }

  return data;
}

export async function updateAlterEgoCategoryPositions(
  userId: string, 
  orderedCategoryIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  try {
    // Filter out the "all" category and any undefined/null values
    const dbCategoryIds = orderedCategoryIds.filter(id => id && id !== 'all');

    // Verify that all categories belong to the user first
    const { data: existingCategories, error: fetchError } = await supabase
      .from('alter_ego_categories')
      .select('id')
      .eq('user_id', userId)
      .in('id', dbCategoryIds);

    if (fetchError) {
      console.error('Error fetching categories:', fetchError);
      return { success: false, error: 'Failed to verify category ownership' };
    }

    // Ensure all categories exist and belong to the user
    const existingIds = new Set(existingCategories?.map(cat => cat.id));
    const invalidIds = dbCategoryIds.filter(id => !existingIds.has(id));
    if (invalidIds.length > 0) {
      console.error('Invalid category IDs:', invalidIds);
      return { success: false, error: 'One or more categories are invalid' };
    }

    // Update positions for each category
    const updates = dbCategoryIds.map((categoryId, index) => 
      supabase
        .from('alter_ego_categories')
        .update({ position: index + 1 }) // Use 1-based positions in DB
        .eq('id', categoryId)
        .eq('user_id', userId)
    );

    // Execute all updates and collect results
    const results = await Promise.all(updates);
    const failed = results.find(res => res.error);

    if (failed) {
      console.error('Failed to update some category positions:', failed.error);
      return { success: false, error: 'Failed to update category positions' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating category positions:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteAlterEgoCategory(
  userId: string, 
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  // Don't allow deleting the "All" category
  if (categoryId === 'all') {
    return { success: false, error: 'Cannot delete the "All" category' };
  }

  // Check if category has any associated alter egos
  const { count } = await supabase
    .from('alter_ego_category_mappings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('category_id', categoryId);

  if (count && count > 0) {
    return { 
      success: false, 
      error: 'Cannot delete category that contains alter egos' 
    };
  }

  // Delete the category
  const { error } = await supabase
    .from('alter_ego_categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
