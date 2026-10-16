-- Each user's chosen app style (see app/lib/app-style.ts), so it follows
-- them across devices and isn't left behind on a shared one after sign-out.
-- NULL means the default (Classic). Values are validated by the app rather
-- than a CHECK constraint, so adding a style needs no migration; unknown
-- values read back as the default.
--
-- Existing policies already cover it: users update only their own profile
-- ("users can update own profile"), and profiles are readable by any
-- authenticated user, which this column is harmless under.
ALTER TABLE public.profiles ADD COLUMN app_style text;
