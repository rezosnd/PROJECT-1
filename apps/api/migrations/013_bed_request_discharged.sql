-- Allow hospital staff to mark admitted patients as left / discharged
ALTER TABLE bed_requests DROP CONSTRAINT IF EXISTS bed_requests_status_check;
ALTER TABLE bed_requests
  ADD CONSTRAINT bed_requests_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ADMITTED', 'DISCHARGED'));
