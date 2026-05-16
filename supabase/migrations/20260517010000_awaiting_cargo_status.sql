-- ============================================================
-- GAMEFICATION CONCURSO.OS — 'awaiting_cargo' status
--   Adiciona o valor de enum usado quando o edital tem
--   múltiplos cargos e ainda falta o usuário escolher um.
-- ============================================================

alter type exam_processing_status add value if not exists 'awaiting_cargo';
