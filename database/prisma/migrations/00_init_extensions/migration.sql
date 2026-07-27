-- Habilita a extensão necessária para uuid_generate_v4(), usada como default
-- de chave primária em todas as tabelas de domínio futuras (Features 2-5).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
