-- Grace period removed: the code duration doubles as the lateness allowance.
-- Clock-in after clock_in_time is 'late'; clock_in_time + code_duration is
-- the hard cutoff (e.g. open 08:00, duration 15 → late until 08:15, then no
-- clock-in at all).
ALTER TABLE "AttendanceSetting" DROP COLUMN "grace_minutes";
