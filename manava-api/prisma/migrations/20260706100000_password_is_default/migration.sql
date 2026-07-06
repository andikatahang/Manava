-- Auto-created editor accounts start on the shared default password; the app
-- prompts them to change it after login until they do.
ALTER TABLE "User" ADD COLUMN "password_is_default" BOOLEAN NOT NULL DEFAULT false;
