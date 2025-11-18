# Storage Setup Guide

## Supabase Storage Configuration

To fix the company logo upload issue, you need to set up storage buckets in your Supabase dashboard.

### 1. Create Storage Buckets

Go to your Supabase dashboard > Storage and create the following buckets:

#### Company Logos Bucket
```
Bucket name: company-logos
Public: true
File size limit: 5MB
Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
```

#### Profile Photos Bucket (optional for user profiles)
```
Bucket name: profile-photos
Public: true
File size limit: 5MB
Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
```

### 2. Set up Storage Policies

For the `company-logos` bucket, create these RLS policies:

#### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated users to upload company logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow users to update their own logos
```sql
CREATE POLICY "Allow users to update their own company logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Allow users to delete their own logos
```sql
CREATE POLICY "Allow users to delete their own company logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 4: Allow public read access
```sql
CREATE POLICY "Allow public read access to company logos" ON storage.objects
FOR SELECT USING (bucket_id = 'company-logos');
```

### 3. Alternative: SQL Script to Create Everything

Run this SQL script in your Supabase SQL editor:

```sql
-- Insert buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for company logos
CREATE POLICY "Allow authenticated users to upload company logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to update their own company logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to delete their own company logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow public read access to company logos" ON storage.objects
FOR SELECT USING (bucket_id = 'company-logos');

-- Create storage policies for profile photos
CREATE POLICY "Allow authenticated users to upload profile photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to update their own profile photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to delete their own profile photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow public read access to profile photos" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-photos');
```

### 4. Verify Setup

After running the setup, test the upload functionality:

1. Go to `/company/profile/edit`
2. Try uploading a company logo
3. The upload should now work without bucket creation errors

### Security Notes

- Files are organized by user ID folders for security
- Users can only upload/modify/delete their own files
- Public read access allows logos to be displayed on job listings
- File size is limited to 5MB per upload
- Only image files are allowed