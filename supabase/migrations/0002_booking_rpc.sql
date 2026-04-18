-- 0002: atomic booking save + booked-count helper
-- Also adds a storage bucket for fruit images.

-- Storage bucket for fruit images (public read).
insert into storage.buckets (id, name, public)
values ('fruit-images', 'fruit-images', true)
on conflict (id) do nothing;

drop policy if exists "public read fruit images" on storage.objects;
create policy "public read fruit images" on storage.objects
  for select to anon using (bucket_id = 'fruit-images');

-- Booked count per fruit in a given week.
create or replace function booked_counts(w_id uuid)
returns table(fruit_id uuid, booked numeric) as $$
  with b as (
    select bi.fruit_id, sum(bi.qty)::numeric as q
    from booking_items bi
    join bookings bk on bk.id = bi.booking_id
    where bk.week_id = w_id and bk.status in ('pending','shipped')
    group by bi.fruit_id
  ),
  r as (
    select (item->>'fruit_id')::uuid as fruit_id,
           sum((item->>'qty')::numeric) as q
    from receipts rc, jsonb_array_elements(rc.items_json) item
    where rc.week_id = w_id
      and rc.status = 'active'
      and rc.deducted_stock = true
      and rc.booking_id is null
    group by (item->>'fruit_id')::uuid
  )
  select fid as fruit_id, coalesce(sum(q),0) as booked
  from (
    select fruit_id as fid, q from b
    union all
    select fruit_id as fid, q from r
  ) x
  group by fid;
$$ language sql stable security definer set search_path = public, pg_temp;

-- Atomic booking save (create or edit).
-- items is jsonb array of {fruit_id, qty}.
-- Returns booking id on success. Raises exception on insufficient stock.
create or replace function save_booking(
  p_booking_id uuid,              -- null = create, non-null = edit
  p_week_id uuid,
  p_customer_name text,
  p_contact text,
  p_items jsonb,                   -- [{fruit_id, qty}]
  p_created_by uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking_id uuid := p_booking_id;
  v_item jsonb;
  v_fruit fruits%ROWTYPE;
  v_stock week_stock%ROWTYPE;
  v_current_booked numeric;
  v_own_qty numeric;
  v_available numeric;
  v_req_qty numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'กรุณาเพิ่มรายการผลไม้อย่างน้อย 1 รายการ';
  end if;

  -- Lock the relevant week_stock rows in fruit_id order to reduce deadlocks.
  perform 1 from week_stock
   where week_id = p_week_id
     and fruit_id in (select (i->>'fruit_id')::uuid from jsonb_array_elements(p_items) i)
   order by fruit_id
   for update;

  -- Validate each line item
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_req_qty := (v_item->>'qty')::numeric;
    if v_req_qty is null or v_req_qty <= 0 then
      raise exception 'จำนวนต้องมากกว่า 0';
    end if;

    select * into v_fruit from fruits where id = (v_item->>'fruit_id')::uuid;
    if not found or v_fruit.deleted_at is not null then
      raise exception 'ไม่พบผลไม้';
    end if;

    select * into v_stock from week_stock
      where week_id = p_week_id and fruit_id = v_fruit.id;
    if not found then
      raise exception 'ผลไม้ "%" ไม่ได้เปิดขายสัปดาห์นี้', v_fruit.name_th;
    end if;

    select coalesce(sum(bi.qty),0) into v_current_booked
      from booking_items bi join bookings bk on bk.id = bi.booking_id
      where bk.week_id = p_week_id
        and bk.status in ('pending','shipped')
        and bi.fruit_id = v_fruit.id;

    -- add walk-in receipt deductions
    select v_current_booked + coalesce((
      select sum((item->>'qty')::numeric)
      from receipts rc, jsonb_array_elements(rc.items_json) item
      where rc.week_id = p_week_id
        and rc.status='active' and rc.deducted_stock=true and rc.booking_id is null
        and (item->>'fruit_id')::uuid = v_fruit.id
    ),0) into v_current_booked;

    -- if editing, subtract this booking's existing items for this fruit
    if v_booking_id is not null then
      select coalesce(sum(bi.qty),0) into v_own_qty
        from booking_items bi join bookings bk on bk.id = bi.booking_id
        where bk.id = v_booking_id and bi.fruit_id = v_fruit.id
          and bk.status in ('pending','shipped');
      v_current_booked := v_current_booked - v_own_qty;
    end if;

    v_available := v_stock.stock_qty - v_current_booked;
    if v_req_qty > v_available then
      raise exception 'ผลไม้ "%" เหลือไม่พอ (เหลือ % %, ขอ %)',
        v_fruit.name_th, v_available, v_fruit.stock_unit, v_req_qty;
    end if;
  end loop;

  -- Upsert booking
  if v_booking_id is null then
    insert into bookings(week_id, customer_name, contact, status, created_by)
    values (p_week_id, p_customer_name, p_contact, 'pending', p_created_by)
    returning id into v_booking_id;
  else
    update bookings
      set customer_name = p_customer_name,
          contact = p_contact,
          updated_at = now()
      where id = v_booking_id;
    delete from booking_items where booking_id = v_booking_id;
  end if;

  -- Insert items with snapshots
  insert into booking_items(booking_id, fruit_id, qty, unit_snapshot, price_snapshot, pricing_mode_snapshot, name_snapshot)
  select v_booking_id,
         f.id,
         (i->>'qty')::numeric,
         f.selling_unit,
         ws.price_value,
         f.pricing_mode,
         f.name_th
  from jsonb_array_elements(p_items) i
  join fruits f on f.id = (i->>'fruit_id')::uuid
  join week_stock ws on ws.week_id = p_week_id and ws.fruit_id = f.id;

  return v_booking_id;
end;
$$;
