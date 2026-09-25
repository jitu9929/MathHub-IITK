MathHub IITK - Corrected Supabase version

This version preserves the existing MathHub IITK design and online Supabase system, and adds:
- Direct PDF/file upload through Supabase Storage
- Admin-only add/edit/delete controls
- Delete Course
- Delete Academic Year
- Delete PYQ/Notes (including uploaded Storage file)
- Full Jitendra Kuri profile moved to the bottom footer
- Public students can read/open resources without login

IMPORTANT:
1. Run SUPABASE_STORAGE_SETUP.sql in Supabase SQL Editor.
2. Replace index.html, app.js and style.css in the GitHub repo.
3. Do not delete or recreate existing database tables.
