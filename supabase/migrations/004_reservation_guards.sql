-- ================================================================
-- Migration 004: Atomic reservation guards to prevent overbooking
-- ================================================================

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

CREATE OR REPLACE FUNCTION public.create_reservation_safely(
  p_unit_id UUID,
  p_environment_id UUID DEFAULT NULL,
  p_pax INT DEFAULT NULL,
  p_reservation_date DATE DEFAULT NULL,
  p_reservation_time TIME DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_occasion TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  confirmation_code TEXT,
  reservation_date DATE,
  reservation_time TIME,
  pax INT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules reservation_rules%ROWTYPE;
  v_slot time_slots%ROWTYPE;
  v_customer_id UUID;
  v_requested_at TIMESTAMP;
  v_now_local TIMESTAMP;
  v_requested_minutes INT;
  v_reserved_pax INT := 0;
  v_reserved_env_pax INT := 0;
  v_environment_capacity INT := NULL;
  v_block RECORD;
BEGIN
  IF p_unit_id IS NULL OR p_pax IS NULL OR p_reservation_date IS NULL OR p_reservation_time IS NULL OR p_name IS NULL OR p_phone IS NULL THEN
    RAISE EXCEPTION 'Campos obrigatorios faltando.';
  END IF;

  IF p_pax <= 0 THEN
    RAISE EXCEPTION 'Quantidade de pessoas invalida.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_unit_id::TEXT),
    hashtext(p_reservation_date::TEXT || '|' || p_reservation_time::TEXT || '|' || COALESCE(p_environment_id::TEXT, 'unit'))
  );

  v_now_local := now() AT TIME ZONE 'America/Sao_Paulo';
  v_requested_at := p_reservation_date::TIMESTAMP + p_reservation_time;
  v_requested_minutes := EXTRACT(HOUR FROM p_reservation_time) * 60 + EXTRACT(MINUTE FROM p_reservation_time);

  SELECT * INTO v_rules
  FROM reservation_rules AS rr
  WHERE rr.unit_id = p_unit_id
  LIMIT 1;

  IF FOUND THEN
    IF p_pax < COALESCE(v_rules.min_pax, 1) THEN
      RAISE EXCEPTION 'A reserva minima para esta unidade e de % pessoa(s).', v_rules.min_pax;
    END IF;

    IF p_pax > COALESCE(v_rules.max_pax, 999999) THEN
      RAISE EXCEPTION 'O limite por reserva nesta unidade e de % pessoa(s).', v_rules.max_pax;
    END IF;

    IF v_requested_at < v_now_local + make_interval(hours => COALESCE(v_rules.min_advance_hours, 0)) THEN
      RAISE EXCEPTION 'As reservas precisam ser feitas com pelo menos % hora(s) de antecedencia.', v_rules.min_advance_hours;
    END IF;

    IF p_reservation_date > (v_now_local::DATE + COALESCE(v_rules.max_advance_days, 3650)) THEN
      RAISE EXCEPTION 'As reservas para esta unidade podem ser feitas com no maximo % dia(s) de antecedencia.', v_rules.max_advance_days;
    END IF;
  END IF;

  SELECT *
    INTO v_slot
  FROM time_slots AS ts
  WHERE ts.unit_id = p_unit_id
    AND ts.is_active = true
    AND ts.day_of_week = EXTRACT(DOW FROM p_reservation_date)::INT
    AND ts.open_time <= p_reservation_time
    AND ts.close_time > p_reservation_time
  ORDER BY ts.open_time DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esse horario nao esta disponivel para reservas.';
  END IF;

  IF MOD(
    (
      (EXTRACT(HOUR FROM p_reservation_time) * 60 + EXTRACT(MINUTE FROM p_reservation_time))
      - (EXTRACT(HOUR FROM v_slot.open_time) * 60 + EXTRACT(MINUTE FROM v_slot.open_time))
    )::INT,
    GREATEST(v_slot.slot_interval_minutes, 1)
  ) <> 0 THEN
    RAISE EXCEPTION 'Horario invalido para este slot.';
  END IF;

  FOR v_block IN
    SELECT start_time, end_time
    FROM date_blocks AS db
    WHERE db.unit_id = p_unit_id
      AND db.block_date = p_reservation_date
  LOOP
    IF (v_block.start_time IS NULL AND v_block.end_time IS NULL)
      OR (v_block.start_time IS NULL AND v_requested_minutes < (EXTRACT(HOUR FROM v_block.end_time) * 60 + EXTRACT(MINUTE FROM v_block.end_time)))
      OR (v_block.end_time IS NULL AND v_requested_minutes >= (EXTRACT(HOUR FROM v_block.start_time) * 60 + EXTRACT(MINUTE FROM v_block.start_time)))
      OR (
        v_block.start_time IS NOT NULL
        AND v_block.end_time IS NOT NULL
        AND v_requested_minutes >= (EXTRACT(HOUR FROM v_block.start_time) * 60 + EXTRACT(MINUTE FROM v_block.start_time))
        AND v_requested_minutes < (EXTRACT(HOUR FROM v_block.end_time) * 60 + EXTRACT(MINUTE FROM v_block.end_time))
      ) THEN
      RAISE EXCEPTION 'Esta data ou horario esta bloqueado para reservas.';
    END IF;
  END LOOP;

  IF p_environment_id IS NOT NULL THEN
    SELECT max_capacity
      INTO v_environment_capacity
    FROM environments AS env
    WHERE env.id = p_environment_id
      AND env.unit_id = p_unit_id
      AND env.is_active = true
    LIMIT 1;

    IF v_environment_capacity IS NULL THEN
      RAISE EXCEPTION 'O ambiente selecionado nao esta disponivel nesta unidade.';
    END IF;

    IF p_pax > v_environment_capacity THEN
      RAISE EXCEPTION 'Esse ambiente comporta no maximo % pessoa(s).', v_environment_capacity;
    END IF;
  END IF;

  SELECT COALESCE(SUM(r.pax), 0)
    INTO v_reserved_pax
  FROM reservations AS r
  WHERE r.unit_id = p_unit_id
    AND r.reservation_date = p_reservation_date
    AND r.reservation_time = p_reservation_time
    AND r.status IN ('pending', 'confirmed', 'seated');

  IF v_reserved_pax + p_pax > v_slot.max_pax_per_slot THEN
    RAISE EXCEPTION 'Esse horario acabou de lotar. Escolha outro horario.';
  END IF;

  IF p_environment_id IS NOT NULL THEN
    SELECT COALESCE(SUM(r.pax), 0)
      INTO v_reserved_env_pax
    FROM reservations AS r
    WHERE r.unit_id = p_unit_id
      AND r.environment_id = p_environment_id
      AND r.reservation_date = p_reservation_date
      AND r.reservation_time = p_reservation_time
      AND r.status IN ('pending', 'confirmed', 'seated');

    IF v_reserved_env_pax + p_pax > v_environment_capacity THEN
      RAISE EXCEPTION 'Esse ambiente nao tem mais disponibilidade para esse horario.';
    END IF;
  END IF;

  INSERT INTO customers AS c (name, email, phone)
  VALUES (p_name, NULLIF(TRIM(p_email), ''), p_phone)
  ON CONFLICT (phone)
  DO UPDATE SET
    name = EXCLUDED.name,
    email = COALESCE(EXCLUDED.email, c.email)
  RETURNING c.id INTO v_customer_id;

  RETURN QUERY
  INSERT INTO reservations AS r (
    unit_id,
    environment_id,
    customer_id,
    reservation_date,
    reservation_time,
    pax,
    status,
    notes,
    source,
    custom_data
  )
  VALUES (
    p_unit_id,
    p_environment_id,
    v_customer_id,
    p_reservation_date,
    p_reservation_time,
    p_pax,
    'confirmed',
    NULLIF(TRIM(p_notes), ''),
    'online',
    jsonb_strip_nulls(jsonb_build_object('occasion', NULLIF(TRIM(p_occasion), '')))
  )
  RETURNING r.id, r.confirmation_code, r.reservation_date, r.reservation_time, r.pax, r.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_reservation_safely(
  p_confirmation_code TEXT,
  p_pax INT DEFAULT NULL,
  p_reservation_date DATE DEFAULT NULL,
  p_reservation_time TIME DEFAULT NULL,
  p_environment_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  reservation_date DATE,
  reservation_time TIME,
  pax INT,
  status TEXT,
  confirmation_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing reservations%ROWTYPE;
  v_rules reservation_rules%ROWTYPE;
  v_slot time_slots%ROWTYPE;
  v_new_date DATE;
  v_new_time TIME;
  v_new_pax INT;
  v_new_environment UUID;
  v_requested_at TIMESTAMP;
  v_now_local TIMESTAMP;
  v_requested_minutes INT;
  v_reserved_pax INT := 0;
  v_reserved_env_pax INT := 0;
  v_environment_capacity INT := NULL;
  v_block RECORD;
BEGIN
  SELECT *
    INTO v_existing
  FROM reservations
  WHERE confirmation_code = UPPER(TRIM(p_confirmation_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva nao encontrada.';
  END IF;

  IF v_existing.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Esta reserva nao pode mais ser alterada.';
  END IF;

  v_new_date := COALESCE(p_reservation_date, v_existing.reservation_date);
  v_new_time := COALESCE(p_reservation_time, v_existing.reservation_time);
  v_new_pax := COALESCE(p_pax, v_existing.pax);
  v_new_environment := COALESCE(p_environment_id, v_existing.environment_id);

  IF v_new_pax <= 0 THEN
    RAISE EXCEPTION 'Quantidade de pessoas invalida.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(v_existing.unit_id::TEXT),
    hashtext(v_new_date::TEXT || '|' || v_new_time::TEXT || '|' || COALESCE(v_new_environment::TEXT, 'unit'))
  );

  v_now_local := now() AT TIME ZONE 'America/Sao_Paulo';
  v_requested_at := v_new_date::TIMESTAMP + v_new_time;
  v_requested_minutes := EXTRACT(HOUR FROM v_new_time) * 60 + EXTRACT(MINUTE FROM v_new_time);

  SELECT * INTO v_rules
  FROM reservation_rules AS rr
  WHERE rr.unit_id = v_existing.unit_id
  LIMIT 1;

  IF FOUND THEN
    IF v_new_pax < COALESCE(v_rules.min_pax, 1) THEN
      RAISE EXCEPTION 'A reserva minima para esta unidade e de % pessoa(s).', v_rules.min_pax;
    END IF;

    IF v_new_pax > COALESCE(v_rules.max_pax, 999999) THEN
      RAISE EXCEPTION 'O limite por reserva nesta unidade e de % pessoa(s).', v_rules.max_pax;
    END IF;

    IF v_requested_at < v_now_local + make_interval(hours => COALESCE(v_rules.min_advance_hours, 0)) THEN
      RAISE EXCEPTION 'As reservas precisam ser feitas com pelo menos % hora(s) de antecedencia.', v_rules.min_advance_hours;
    END IF;

    IF v_new_date > (v_now_local::DATE + COALESCE(v_rules.max_advance_days, 3650)) THEN
      RAISE EXCEPTION 'As reservas para esta unidade podem ser feitas com no maximo % dia(s) de antecedencia.', v_rules.max_advance_days;
    END IF;
  END IF;

  SELECT *
    INTO v_slot
  FROM time_slots AS ts
  WHERE ts.unit_id = v_existing.unit_id
    AND ts.is_active = true
    AND ts.day_of_week = EXTRACT(DOW FROM v_new_date)::INT
    AND ts.open_time <= v_new_time
    AND ts.close_time > v_new_time
  ORDER BY ts.open_time DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esse horario nao esta disponivel para reservas.';
  END IF;

  IF MOD(
    (
      (EXTRACT(HOUR FROM v_new_time) * 60 + EXTRACT(MINUTE FROM v_new_time))
      - (EXTRACT(HOUR FROM v_slot.open_time) * 60 + EXTRACT(MINUTE FROM v_slot.open_time))
    )::INT,
    GREATEST(v_slot.slot_interval_minutes, 1)
  ) <> 0 THEN
    RAISE EXCEPTION 'Horario invalido para este slot.';
  END IF;

  FOR v_block IN
    SELECT start_time, end_time
    FROM date_blocks AS db
    WHERE db.unit_id = v_existing.unit_id
      AND db.block_date = v_new_date
  LOOP
    IF (v_block.start_time IS NULL AND v_block.end_time IS NULL)
      OR (v_block.start_time IS NULL AND v_requested_minutes < (EXTRACT(HOUR FROM v_block.end_time) * 60 + EXTRACT(MINUTE FROM v_block.end_time)))
      OR (v_block.end_time IS NULL AND v_requested_minutes >= (EXTRACT(HOUR FROM v_block.start_time) * 60 + EXTRACT(MINUTE FROM v_block.start_time)))
      OR (
        v_block.start_time IS NOT NULL
        AND v_block.end_time IS NOT NULL
        AND v_requested_minutes >= (EXTRACT(HOUR FROM v_block.start_time) * 60 + EXTRACT(MINUTE FROM v_block.start_time))
        AND v_requested_minutes < (EXTRACT(HOUR FROM v_block.end_time) * 60 + EXTRACT(MINUTE FROM v_block.end_time))
      ) THEN
      RAISE EXCEPTION 'Esta data ou horario esta bloqueado para reservas.';
    END IF;
  END LOOP;

  IF v_new_environment IS NOT NULL THEN
    SELECT max_capacity
      INTO v_environment_capacity
    FROM environments AS env
    WHERE env.id = v_new_environment
      AND env.unit_id = v_existing.unit_id
      AND env.is_active = true
    LIMIT 1;

    IF v_environment_capacity IS NULL THEN
      RAISE EXCEPTION 'O ambiente selecionado nao esta disponivel nesta unidade.';
    END IF;

    IF v_new_pax > v_environment_capacity THEN
      RAISE EXCEPTION 'Esse ambiente comporta no maximo % pessoa(s).', v_environment_capacity;
    END IF;
  END IF;

  SELECT COALESCE(SUM(r.pax), 0)
    INTO v_reserved_pax
  FROM reservations AS r
  WHERE r.unit_id = v_existing.unit_id
    AND r.reservation_date = v_new_date
    AND r.reservation_time = v_new_time
    AND r.id <> v_existing.id
    AND r.status IN ('pending', 'confirmed', 'seated');

  IF v_reserved_pax + v_new_pax > v_slot.max_pax_per_slot THEN
    RAISE EXCEPTION 'Esse horario acabou de lotar. Escolha outro horario.';
  END IF;

  IF v_new_environment IS NOT NULL THEN
    SELECT COALESCE(SUM(r.pax), 0)
      INTO v_reserved_env_pax
    FROM reservations AS r
    WHERE r.unit_id = v_existing.unit_id
      AND r.environment_id = v_new_environment
      AND r.reservation_date = v_new_date
      AND r.reservation_time = v_new_time
      AND r.id <> v_existing.id
      AND r.status IN ('pending', 'confirmed', 'seated');

    IF v_reserved_env_pax + v_new_pax > v_environment_capacity THEN
      RAISE EXCEPTION 'Esse ambiente nao tem mais disponibilidade para esse horario.';
    END IF;
  END IF;

  RETURN QUERY
  UPDATE reservations AS r
  SET
    pax = v_new_pax,
    reservation_date = v_new_date,
    reservation_time = v_new_time,
    environment_id = v_new_environment,
    updated_at = now()
  WHERE r.id = v_existing.id
  RETURNING r.id, r.reservation_date, r.reservation_time, r.pax, r.status, r.confirmation_code;
END;
$$;
