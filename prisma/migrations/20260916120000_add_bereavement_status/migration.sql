-- Add the bereavement leave option without changing existing attendance rows.
ALTER TYPE "AttendanceStatus" ADD VALUE 'LEAVE_BEREAVEMENT';
