# Supabase Storage Setup for Image Uploads

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `medical-supplies-images`
   - **Public bucket**: ✅ **Enable this** (so images can be accessed via public URLs)
   - **File size limit**: 5MB (or your preferred limit)
   - **Allowed MIME types**: `image/*` (or specific types like `image/jpeg,image/png,image/webp`)

5. Click **"Create bucket"**

## Step 2: Set Up Storage Policies (RLS)

After creating the bucket, you need to set up Row Level Security policies:

### Option A: Allow All Authenticated Users to Upload (Recommended)

Run this SQL in the Supabase SQL Editor:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-supplies-images');

-- Allow authenticated users to read images
CREATE POLICY "Authenticated users can read images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'medical-supplies-images');

-- Allow authenticated users to update their own images
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'medical-supplies-images')
WITH CHECK (bucket_id = 'medical-supplies-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'medical-supplies-images');
```

### Option B: Public Read, Authenticated Write

If you want images to be publicly readable but only authenticated users can upload:

```sql
-- Allow public to read images
CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'medical-supplies-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-supplies-images');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'medical-supplies-images')
WITH CHECK (bucket_id = 'medical-supplies-images');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'medical-supplies-images');
```

## Step 3: Verify Setup

1. Try uploading an image through the app
2. Check the Storage section in Supabase Dashboard to see if the file appears
3. Click on the uploaded file to verify it's accessible

## Troubleshooting

### "Bucket not found" error
- Make sure the bucket name is exactly `medical-supplies-images`
- Check that the bucket exists in Storage section

### "new row violates row-level security policy" error
- Run the RLS policies SQL above
- Make sure you're logged in as an authenticated user

### Images not displaying
- Check that the bucket is set to **Public**
- Verify the public URL is being generated correctly
- Check browser console for CORS errors

### File size too large
- Increase the file size limit in bucket settings
- Or reduce the max file size validation in the code (currently 5MB)

## Notes

- Images are stored in the `medical-supplies-images` bucket
- File names are generated as: `{itemId}-{timestamp}.{extension}` for existing items, or `temp-{timestamp}-{random}.{extension}` for new items
- Old images are not automatically deleted when new ones are uploaded (you may want to add cleanup logic later)

