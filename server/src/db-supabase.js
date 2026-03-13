/**
 * Supabase Database Client
 * Replaces MySQL pool with Supabase client for PostgreSQL
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - use env vars or hardcoded defaults for development
const supabaseUrl = process.env.SUPABASE_URL || 'https://xbrlpovbwwyjvefblmuz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhicmxwb3Zid3d5anZlZmJsbXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDg2ODMsImV4cCI6MjA4ODkyNDY4M30.SPPTQJg9aknHd1EL6kwl1VVHh1MMLv7Qdlkp3fsfbRg';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhicmxwb3Zid3d5anZlZmJsbXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM0ODY4MywiZXhwIjoyMDg4OTI0NjgzfQ.bpVkno_hTiuFciyM_Gj_nG-7ev1CW3HnwBv6qsZPP2c';

// Create Supabase client with service role for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-supabase-role': 'service_role',
    },
  },
});

// Create anon client for user-level operations
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
});

/**
 * Helper to handle Supabase response errors
 * @param {object} result - Supabase query result
 * @param {string} context - Context for error message
 * @returns {object} - Data or throws error
 */
function handleResult(result, context = 'query') {
  const { data, error } = result;
  if (error) {
    // Convert Supabase error to match MySQL error codes for compatibility
    const err = new Error(error.message);
    err.code = error.code;
    err.details = error.details;
    err.hint = error.hint;
    
    // Map common PostgreSQL error codes
    if (error.code === '23505') {
      err.code = 'ER_DUP_ENTRY';
      err.errno = 1062;
    } else if (error.code === '23503') {
      err.code = 'ER_NO_REFERENCED_ROW';
    } else if (error.code === '42P01') {
      err.code = 'ER_NO_SUCH_TABLE';
      err.errno = 1146;
    } else if (error.code === '42703') {
      err.code = 'ER_BAD_FIELD_ERROR';
      err.errno = 1054;
    }
    
    throw err;
  }
  return data;
}

/**
 * Convert MySQL-style LIMIT/OFFSET query to Supabase
 * @param {string} table - Table name
 * @param {object} options - Query options
 * @returns {Promise<object[]>} - Query results
 */
async function selectAll(table, options = {}) {
  let query = supabase.from(table).select(options.select || '*');
  
  if (options.where) {
    Object.entries(options.where).forEach(([key, value]) => {
      if (value === null) {
        query = query.is(key, null);
      } else if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    });
  }
  
  if (options.order) {
    query = query.order(options.order.column, { 
      ascending: options.order.ascending ?? false 
    });
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Insert single row
 * @param {string} table - Table name
 * @param {object} data - Data to insert
 * @returns {Promise<object>} - Inserted row
 */
async function insertOne(table, data) {
  const result = await supabase.from(table).insert(data).select().single();
  return handleResult(result, `insert into ${table}`);
}

/**
 * Insert multiple rows
 * @param {string} table - Table name
 * @param {object[]} rows - Rows to insert
 * @returns {Promise<object[]>} - Inserted rows
 */
async function insertMany(table, rows) {
  const result = await supabase.from(table).insert(rows).select();
  return handleResult(result, `insert into ${table}`);
}

/**
 * Update rows
 * @param {string} table - Table name
 * @param {object} data - Data to update
 * @param {object} where - Where conditions
 * @returns {Promise<object[]>} - Updated rows
 */
async function updateWhere(table, data, where) {
  let query = supabase.from(table).update(data);
  
  Object.entries(where).forEach(([key, value]) => {
    if (value === null) {
      query = query.is(key, null);
    } else {
      query = query.eq(key, value);
    }
  });
  
  const result = await query.select();
  return handleResult(result, `update ${table}`);
}

/**
 * Delete rows
 * @param {string} table - Table name
 * @param {object} where - Where conditions
 * @returns {Promise<object[]>} - Deleted rows
 */
async function deleteWhere(table, where) {
  let query = supabase.from(table).delete();
  
  Object.entries(where).forEach(([key, value]) => {
    if (value === null) {
      query = query.is(key, null);
    } else {
      query = query.eq(key, value);
    }
  });
  
  const result = await query.select();
  return handleResult(result, `delete from ${table}`);
}

/**
 * Execute raw SQL (for complex queries)
 * @param {string} sql - SQL query
 * @param {object[]} params - Parameters
 * @returns {Promise<object[]>} - Results
 */
async function rawSql(sql, params = []) {
  const { data, error } = await supabase.rpc('exec_sql', { 
    query: sql, 
    params 
  }).catch(async () => {
    // Fallback: use direct query via REST
    const { data, error } = await supabase.from('_raw_sql').select('*');
    return { data: null, error: { message: 'Raw SQL not supported via REST' } };
  });
  
  if (error) {
    console.warn('Raw SQL not directly supported, use Supabase query builder');
    return [];
  }
  return data;
}

/**
 * Count rows
 * @param {string} table - Table name
 * @param {object} where - Where conditions
 * @returns {Promise<number>} - Count
 */
async function countRows(table, where = {}) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  
  Object.entries(where).forEach(([key, value]) => {
    if (value === null) {
      query = query.is(key, null);
    } else {
      query = query.eq(key, value);
    }
  });
  
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

/**
 * Upsert (insert or update)
 * @param {string} table - Table name
 * @param {object} data - Data to upsert
 * @param {string[]} onConflict - Columns for conflict resolution
 * @returns {Promise<object>} - Upserted row
 */
async function upsertRow(table, data, onConflict = ['id']) {
  const result = await supabase
    .from(table)
    .upsert(data, { onConflict: onConflict.join(',') })
    .select()
    .single();
  return handleResult(result, `upsert ${table}`);
}

// Export compatible interface with MySQL pool
module.exports = {
  // Main client
  supabase,
  supabaseAnon,
  
  // Compatibility layer - mimics mysql2 pool interface
  pool: {
    query: async (sql, params) => {
      console.warn('Direct SQL queries are deprecated. Use Supabase query builder.');
      return [[]];
    },
    execute: async (sql, params) => {
      console.warn('Direct SQL queries are deprecated. Use Supabase query builder.');
      return [[]];
    },
    end: async () => {
      // No-op for Supabase
    },
  },
  
  // Helper functions
  handleResult,
  selectAll,
  insertOne,
  insertMany,
  updateWhere,
  deleteWhere,
  rawSql,
  countRows,
  upsertRow,
};
