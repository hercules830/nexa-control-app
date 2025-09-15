// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vrfwipoapddpkohavocq.supabase.co' // Pega tu URL aquí
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyZndpcG9hcGRkcGtvaGF2b2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTQxNDIsImV4cCI6MjA3MzQ5MDE0Mn0.WzHUB2kKZSPxyJNHexApOwjcnnz6rLshfvBWzJGajVk' // Pega tu clave pública 'anon' aquí

export const supabase = createClient(supabaseUrl, supabaseAnonKey)