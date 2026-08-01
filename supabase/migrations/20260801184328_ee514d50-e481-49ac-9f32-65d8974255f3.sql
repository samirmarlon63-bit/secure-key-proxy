CREATE POLICY "public insert receipts media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "public update receipts media" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts');
CREATE POLICY "public delete receipts media" ON storage.objects FOR DELETE USING (bucket_id = 'receipts');