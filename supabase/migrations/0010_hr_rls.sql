-- Row Level Security for the HR back-end. Read these as the enforced answer to
-- "who can see/change what" — the UI mirrors it but the database is the gate.

alter table personal_details   enable row level security;
alter table next_of_kin        enable row level security;
alter table hr_records         enable row level security;
alter table probation          enable row level security;
alter table appraisals         enable row level security;
alter table rtw_interviews     enable row level security;
alter table toil_entries       enable row level security;
alter table employee_documents enable row level security;
alter table service_awards     enable row level security;
alter table hr_audit           enable row level security;

-- PERSONAL DETAILS: self + HR (no managers — includes home address).
create policy "pd read"  on personal_details for select to authenticated
  using (user_id = auth.uid() or public.is_hr());
create policy "pd write" on personal_details for insert to authenticated
  with check (user_id = auth.uid() or public.is_hr());
create policy "pd update" on personal_details for update to authenticated
  using (user_id = auth.uid() or public.is_hr())
  with check (user_id = auth.uid() or public.is_hr());

-- NEXT OF KIN: self + HR.
create policy "nok read" on next_of_kin for select to authenticated
  using (user_id = auth.uid() or public.is_hr());
create policy "nok insert" on next_of_kin for insert to authenticated
  with check (user_id = auth.uid() or public.is_hr());
create policy "nok update" on next_of_kin for update to authenticated
  using (user_id = auth.uid() or public.is_hr())
  with check (user_id = auth.uid() or public.is_hr());
create policy "nok delete" on next_of_kin for delete to authenticated
  using (user_id = auth.uid() or public.is_hr());

-- HR RECORD (PAY): self + HR can read; only HR can write. Managers cannot see.
create policy "hr read" on hr_records for select to authenticated
  using (user_id = auth.uid() or public.is_hr());
create policy "hr insert" on hr_records for insert to authenticated
  with check (public.is_hr());
create policy "hr update" on hr_records for update to authenticated
  using (public.is_hr()) with check (public.is_hr());

-- PROBATION: self + line manager + HR (read); manager + HR (write).
create policy "prob read" on probation for select to authenticated
  using (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_hr());
create policy "prob insert" on probation for insert to authenticated
  with check (public.is_manager_of(user_id) or public.is_hr());
create policy "prob update" on probation for update to authenticated
  using (public.is_manager_of(user_id) or public.is_hr())
  with check (public.is_manager_of(user_id) or public.is_hr());

-- APPRAISALS: self + manager + HR (read); manager + HR (write).
create policy "appr read" on appraisals for select to authenticated
  using (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_hr());
create policy "appr insert" on appraisals for insert to authenticated
  with check (public.is_manager_of(user_id) or public.is_hr());
create policy "appr update" on appraisals for update to authenticated
  using (public.is_manager_of(user_id) or public.is_hr())
  with check (public.is_manager_of(user_id) or public.is_hr());
create policy "appr delete" on appraisals for delete to authenticated
  using (public.is_manager_of(user_id) or public.is_hr());

-- RETURN TO WORK: self + manager + HR (read); manager + HR (write).
create policy "rtw read" on rtw_interviews for select to authenticated
  using (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_hr());
create policy "rtw insert" on rtw_interviews for insert to authenticated
  with check (public.is_manager_of(user_id) or public.is_hr());
create policy "rtw update" on rtw_interviews for update to authenticated
  using (public.is_manager_of(user_id) or public.is_hr())
  with check (public.is_manager_of(user_id) or public.is_hr());
create policy "rtw delete" on rtw_interviews for delete to authenticated
  using (public.is_manager_of(user_id) or public.is_hr());

-- TOIL: self + manager + HR (read); manager + HR (write).
create policy "toil read" on toil_entries for select to authenticated
  using (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_hr());
create policy "toil insert" on toil_entries for insert to authenticated
  with check (public.is_manager_of(user_id) or public.is_hr());
create policy "toil delete" on toil_entries for delete to authenticated
  using (public.is_manager_of(user_id) or public.is_hr());

-- DOCUMENTS (metadata): self + HR (read); HR (write).
create policy "doc read" on employee_documents for select to authenticated
  using (user_id = auth.uid() or public.is_hr());
create policy "doc insert" on employee_documents for insert to authenticated
  with check (public.is_hr());
create policy "doc delete" on employee_documents for delete to authenticated
  using (public.is_hr());

-- SERVICE AWARDS: everyone can celebrate; HR records them.
create policy "award read" on service_awards for select to authenticated
  using (true);
create policy "award insert" on service_awards for insert to authenticated
  with check (public.is_hr());
create policy "award delete" on service_awards for delete to authenticated
  using (public.is_hr());

-- AUDIT: HR reads; any signed-in user may append their own action rows.
create policy "audit read" on hr_audit for select to authenticated
  using (public.is_hr());
create policy "audit insert" on hr_audit for insert to authenticated
  with check (actor_id = auth.uid());
