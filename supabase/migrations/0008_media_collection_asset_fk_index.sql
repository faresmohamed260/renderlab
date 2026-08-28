create index media_collection_items_media_asset_id_idx
  on public.media_collection_items (media_asset_id, collection_id);

comment on index public.media_collection_items_media_asset_id_idx is
  'Covers media_asset_id foreign-key lookup/cascade while retaining collection identity for durable media membership cleanup.';
