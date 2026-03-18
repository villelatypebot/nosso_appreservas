-- ================================================================
-- Migration 003: Ajustes para Environments e novas funcionalidades
-- Cole no SQL Editor: https://supabase.com/dashboard/project/bqroijjherbnhsdsnaor/sql/new
-- ================================================================

-- 1. Adicionar colunas que faltam na tabela environments
ALTER TABLE environments
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. Renomear capacity -> max_capacity para consistência
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'environments' AND column_name = 'capacity'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'environments' AND column_name = 'max_capacity'
  ) THEN
    ALTER TABLE environments RENAME COLUMN capacity TO max_capacity;
  END IF;
END $$;

-- 3. Garantir RLS desabilitado para acesso admin (as tabelas já devem estar sem RLS)
-- Se precisar habilitar RLS no futuro, adicione policies aqui.
