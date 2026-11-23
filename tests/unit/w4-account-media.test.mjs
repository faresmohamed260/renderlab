import assert from "node:assert/strict";
import test from "node:test";
import { installRiskHarness, fakeDb, storageFixture, ownerA, ownerB, foreignId, fixedIso } from "../helpers/w4-fixture.mjs";

installRiskHarness({ storage: true });
const profiles = await import("../../src/server/account/account-profile.ts");
const media = await import("../../src/server/media/media-assets.ts");
const collections = await import("../../src/server/media/media-collections.ts");
const uploads = await import("../../src/server/media/media-uploads.ts");

const assetId = "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa";
const collectionId = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const assetRow = (overrides = {}) => ({
  id: assetId, owner_id: ownerA, generation_job_id: null,
  origin: "uploaded", kind: "image", mime_type: "image/png",
  storage_key: "owner-a/image.png", thumbnail_storage_key: "owner-a/thumb.webp",
  original_filename: "portrait.png", display_name: "Portrait", size_bytes: 10,
  width: 200, height: 200, duration_ms: null, provenance: {}, metadata: {},
  created_at: fixedIso, updated_at: fixedIso, favorited_at: null,
  deleted_at: null, purged_at: null, ...overrides,
});
const profileRow = (overrides = {}) => ({
  owner_id:ownerA,display_name:"Safe",avatar_state:"none",avatar_content_type:null,
  avatar_size_bytes:null,avatar_width:null,avatar_height:null,avatar_updated_at:null,
  created_at:fixedIso,updated_at:fixedIso,...overrides,
});
const collectionRow = (overrides = {}) => ({
  id:collectionId,owner_id:ownerA,name:"Portfolio",
  created_at:fixedIso,updated_at:fixedIso,...overrides,
});

test("W4 profile: NFC normalization, whitespace, control and code-point bounds",()=>{
  assert.equal(profiles.normalizeRenderLabDisplayName("  Cafe\u0301   Work  "),"Café Work");
  assert.equal(profiles.normalizeRenderLabDisplayName("  "),null);
  assert.equal(profiles.normalizeRenderLabDisplayName(null),null);
  assert.equal(profiles.normalizeRenderLabDisplayName("🙂".repeat(80)).length,160);
  assert.throws(()=>profiles.normalizeRenderLabDisplayName("🙂".repeat(81)),/too_long/);
  for(const invalid of [false,3,"safe\u0000bad"])assert.throws(()=>profiles.normalizeRenderLabDisplayName(invalid),/invalid/);
});

test("W4 profile: suspended deletion lifecycle prevents display-name mutation",async(t)=>{
  const calls=fakeDb(t,({path,query})=>{
    assert.equal(path,"renderlab_account_lifecycle");
    assert.equal(query.get("user_id"),"eq."+ownerA);
    return [{user_id:ownerA}];
  });
  await assert.rejects(()=>profiles.updateRenderLabDisplayName(ownerA,"Changed"),/account_deletion_in_progress/);
  assert.deepEqual(calls.map(c=>c.method),["GET"]);
  assert.equal(calls.some(c=>c.path==="renderlab_account_profiles"),false);
});

test("W4 profile: display-name write binds caller owner and never trusts foreign ID",async(t)=>{
  const calls=fakeDb(t,({path,body})=>path==="renderlab_account_lifecycle"?[]:
    (assert.equal(body.owner_id,ownerA),[profileRow({display_name:body.display_name})]));
  const result=await profiles.updateRenderLabDisplayName(ownerA,"  My   Profile  ");
  assert.equal(result.displayName,"My Profile");
  assert.deepEqual(calls.map(c=>c.path),["renderlab_account_lifecycle","renderlab_account_profiles"]);
  assert.deepEqual(calls[1].body,{owner_id:ownerA,display_name:"My Profile",updated_at:fixedIso});
});

test("W4 profile: avatar URL exists only for owned active avatar and existing R2 object",async(t)=>{
  const store=storageFixture();
  const calls=fakeDb(t,()=>[profileRow({avatar_state:"active",avatar_updated_at:fixedIso})]);
  const url=await profiles.getRenderLabAccountAvatarReadUrl(ownerA);
  assert.equal(url,"https://signed.invalid/read");
  assert.deepEqual(store.read,[{key:profiles.accountProfileAvatarKey(ownerA),ttl:60}]);
  assert.equal(calls[0].query.get("owner_id"),"eq."+ownerA);
  store.objectExists=false;
  assert.equal(await profiles.getRenderLabAccountAvatarReadUrl(ownerA),null);
  assert.equal(store.read.length,1);
});

test("W4 profile: removing avatar marks non-readable before deleting only caller object",async(t)=>{
  const store=storageFixture();store.objectExists=false;
  const calls=fakeDb(t,({path,method,body})=>{
    if(path==="renderlab_account_lifecycle")return [];
    if(method==="GET"&&path==="renderlab_account_profiles")return [profileRow({avatar_state:"active",avatar_updated_at:fixedIso})];
    if(method==="POST")return [profileRow({avatar_state:body.avatar_state})];
    return [];
  });
  const result=await profiles.removeRenderLabAccountAvatar(ownerA);
  assert.equal(result.avatarState,"none");
  assert.deepEqual(store.deleted,[profiles.accountProfileAvatarKey(ownerA)]);
  assert.deepEqual(calls.filter(c=>c.method==="POST").map(c=>c.body.avatar_state),["purge_pending","none"]);
  assert(calls.filter(c=>c.method==="POST").every(c=>c.body.owner_id===ownerA));
});

test("W4 profile: purge backlog is bounded to eight and failures remain visible",async(t)=>{
  const store=storageFixture();store.objectExists=false;store.failDelete=true;
  const calls=fakeDb(t,({path})=>path==="renderlab_account_profiles"?[{owner_id:ownerA}]:[]);
  assert.deepEqual(await profiles.runAccountAvatarPurgeMaintenance(500),{scanned:1,settled:0,failed:1});
  assert.equal(calls[0].query.get("limit"),"8");
  assert.deepEqual(store.deleted,[profiles.accountProfileAvatarKey(ownerA)]);
});

test("W4 media: foreign asset read/deletion never obtains storage access",async(t)=>{
  const store=storageFixture();
  const calls=fakeDb(t,({query})=>{
    assert.equal(query.get("owner_id"),"eq."+ownerA);
    return [];
  });
  assert.equal(await media.getMediaAsset(ownerA,foreignId),null);
  assert.equal(await media.deleteMediaAsset(ownerA,foreignId),null);
  assert.equal(calls.length,2);
  assert.deepEqual(store.deleted,[]);
  assert.deepEqual(store.read,[]);
});

test("W4 media: soft deletion purges unique object keys exactly once; replay idempotent",async(t)=>{
  const store=storageFixture();
  let row=assetRow();
  const calls=fakeDb(t,({path,method,query,body})=>{
    assert.equal(path,"media_assets");
    assert.equal(query.get("owner_id"),"eq."+ownerA);
    assert.equal(query.get("id"),"eq."+assetId);
    if(method==="GET")return [row];
    if(method==="PATCH"){
      row={...row,...body};
      return [row];
    }
    throw Error("Unexpected DB mutation");
  });
  const first=await media.deleteMediaAsset(ownerA,assetId);
  assert.equal(first.cleanupPending,false);
  assert.equal(first.deletedAt,fixedIso);
  assert.equal(first.purgedAt,fixedIso);
  assert.deepEqual(store.deleted,["owner-a/image.png","owner-a/thumb.webp"]);
  const replay=await media.deleteMediaAsset(ownerA,assetId);
  assert.deepEqual(replay,first);
  assert.equal(store.deleted.length,2,"Retry must not delete already-purged objects");
  assert.equal(calls.filter(c=>c.method==="PATCH").length,2);
  assert(calls.filter(c=>c.method==="PATCH").every(c=>c.query.get("owner_id")==="eq."+ownerA));
});

test("W4 media: failed R2 cleanup stays pending rather than claiming purge success",async(t)=>{
  const store=storageFixture();store.failDelete=true;
  let row=assetRow({deleted_at:fixedIso});
  const calls=fakeDb(t,({method,body})=>{
    if(method==="GET")return [row];
    if(method==="PATCH"){row={...row,...body};return [row];}
    return [];
  });
  const result=await media.deleteMediaAsset(ownerA,assetId);
  assert.equal(result.cleanupPending,true);
  assert.equal(result.purgedAt,null);
  assert.equal(calls.filter(c=>c.method==="PATCH").length,0,"Do not mark purge complete after storage failure");
});

test("W4 media: traversal and reserved names are sanitized, signed filename never contains prompt",async()=>{
  const store=storageFixture();
  const untrusted=assetRow({original_filename:"C:\\folder\\CON.exe",provenance:{prompt:"SECRET_PROMPT"}});
  assert.equal(media.mediaAssetDownloadFilename(untrusted),"renderlab-CON.png");
  assert.equal(await media.getMediaAssetDownloadUrl(untrusted),"https://signed.invalid/download");
  assert.equal(store.download.length,1);
  const body=JSON.stringify(store.download[0]);
  assert(!body.includes("SECRET_PROMPT"));
  assert(!body.includes("C:\\folder"));
  assert.equal(store.download[0].key,"owner-a/image.png");
  assert.equal(store.download[0].expiresIn,300);
});

test("W4 media: owner/collection filters and pagination cap are applied before reading",async(t)=>{
  const calls=fakeDb(t,()=>Array.from({length:49},(_,i)=>assetRow({id:String(i)})));
  const result=await media.listMediaAssets({
    ownerId:ownerA,collectionId,kind:"image",favoriteOnly:true,sort:"oldest",limit:999,offset:-5,
  });
  assert.equal(result.items.length,48);
  assert.deepEqual(result.page,{limit:48,offset:0,hasMore:true});
  const q=calls[0].query;
  assert.equal(q.get("owner_id"),"eq."+ownerA);
  assert.equal(q.get("media_collection_items.owner_id"),"eq."+ownerA);
  assert.equal(q.get("media_collection_items.collection_id"),"eq."+collectionId);
  assert.equal(q.get("deleted_at"),"is.null");
  assert.equal(q.get("limit"),"49");
  assert.equal(q.get("order"),"created_at.asc,id.asc");
});

test("W4 collections: foreign collection is absent and cannot accept member assets",async(t)=>{
  const store=storageFixture();
  const calls=fakeDb(t,()=>[]);
  assert.deepEqual(await collections.setMediaCollectionMembership(ownerA,foreignId,assetId,true),
    {ok:false,reason:"collection_not_found"});
  assert.equal(calls.length,1);
  assert.equal(calls[0].query.get("owner_id"),"eq."+ownerA);
  assert.deepEqual(await collections.setResolvedMediaCollectionMembership(ownerA,
    collectionRow({owner_id:ownerB}),assetId,true),{ok:false,reason:"asset_not_found"});
  assert.equal(calls.length,1,"Foreign resolved collection must be rejected before DB or storage");
  assert.deepEqual(store.deleted,[]);
});

test("W4 collections: owned collection cannot attach foreign asset",async(t)=>{
  const calls=fakeDb(t,({path})=>path==="media_collections"?[collectionRow()]:[]);
  assert.deepEqual(await collections.setMediaCollectionMembership(ownerA,collectionId,foreignId,true),
    {ok:false,reason:"asset_not_found"});
  assert.deepEqual(calls.map(c=>c.path),["media_collections","media_assets"]);
  assert(calls.every(c=>c.query.get("owner_id")==="eq."+ownerA));
  assert(!calls.some(c=>c.method==="POST"));
});

test("W4 collections: idempotent existing membership does not write",async(t)=>{
  const calls=fakeDb(t,({path})=>{
    if(path==="media_collections")return [collectionRow()];
    if(path==="media_assets")return [assetRow()];
    if(path==="media_collection_items")return [{owner_id:ownerA,collection_id:collectionId,media_asset_id:assetId}];
    throw Error("Unexpected table");
  });
  const result=await collections.setMediaCollectionMembership(ownerA,collectionId,assetId,true);
  assert.equal(result.ok,true);
  assert.equal(result.containsAsset,true);
  assert.equal(calls.filter(c=>c.method!=="GET").length,0);
});

test("W4 collections: new membership binds same owner in insert and touch",async(t)=>{
  const calls=fakeDb(t,({path,method,body})=>{
    if(path==="media_collections")return [collectionRow()];
    if(path==="media_assets")return [assetRow()];
    if(path==="media_collection_items"&&method==="GET")return [];
    if(path==="media_collection_items"&&method==="POST")return null;
    if(path==="media_collections"&&method==="PATCH")return [collectionRow()];
    throw Error("Unexpected call: "+method+" "+path);
  });
  const result=await collections.setMediaCollectionMembership(ownerA,collectionId,assetId,true);
  assert.equal(result.ok,true);
  const insert=calls.find(c=>c.path==="media_collection_items"&&c.method==="POST");
  assert.deepEqual(insert?.body,{owner_id:ownerA,collection_id:collectionId,media_asset_id:assetId});
  assert(calls.filter(c=>c.method==="PATCH").every(c=>c.query.get("owner_id")==="eq."+ownerA));
});

test("W4 collections: duplicate name maps SQL conflict to safe domain error",async(t)=>{
  const calls=fakeDb(t,()=>({__dbError:"duplicate key SENSITIVE_UPSTREAM_DETAIL_SENTINEL",code:"23505",status:409}));
  await assert.rejects(()=>collections.createMediaCollection(ownerA," Portfolio "),error=>{
    assert(error instanceof RangeError);
    assert.match(error.message,/already exists/i);
    assert(!error.message.includes("SENSITIVE_UPSTREAM_DETAIL_SENTINEL"));
    return true;
  });
  assert.equal(calls[0].body.owner_id,ownerA);
});

test("W4 media upload: owner-foreign or failed upload never reads signed content",async(t)=>{
  const store=storageFixture();
  const calls=fakeDb(t,({query})=>{
    assert.equal(query.get("owner_id"),"eq."+ownerA);
    return [];
  });
  assert.equal(await uploads.completeMediaUpload(ownerA,{uploadId:foreignId}),null);
  assert.equal(calls.length,1);
  assert.deepEqual(store.head,[]);
});

test("W4 media upload: completed ticket replays existing owner asset without duplicate write",async(t)=>{
  const store=storageFixture();
  const calls=fakeDb(t,({path,query})=>{
    assert.equal(query.get("owner_id"),"eq."+ownerA);
    if(path==="media_upload_sessions")return [{
      id:foreignId,owner_id:ownerA,storage_key:"owner-a/image.png",size_bytes:10,
      status:"completed",media_asset_id:assetId,metadata:{},mime_type:"image/png",
    }];
    if(path==="media_assets")return [assetRow()];
    throw Error("Unexpected table");
  });
  const result=await uploads.completeMediaUpload(ownerA,{uploadId:foreignId});
  assert.equal(result.id,assetId);
  assert.deepEqual(calls.map(c=>c.method),["GET","GET"]);
  assert.deepEqual(store.head,[]);
});

test("W4 media upload: mismatched object size fails, records safe status, never creates asset",async(t)=>{
  const store=storageFixture();store.objectHead.sizeBytes=9;
  const calls=fakeDb(t,({path,method,body})=>{
    if(path==="media_upload_sessions"&&method==="GET")return [{
      id:foreignId,owner_id:ownerA,storage_key:"owner-a/image.png",size_bytes:10,
      status:"pending",media_asset_id:null,metadata:{},mime_type:"image/png",
    }];
    if(path==="media_upload_sessions"&&method==="PATCH")return null;
    throw Error("Unanticipated persistence or storage read");
  });
  await assert.rejects(()=>uploads.completeMediaUpload(ownerA,{uploadId:foreignId}),/did not match/);
  assert.deepEqual(store.head,["owner-a/image.png"]);
  assert.equal(calls.length,2);
  assert.equal(calls[1].method,"PATCH");
  assert.equal(calls[1].query.get("owner_id"),"eq."+ownerA);
  assert.equal(calls[1].body.status,"failed");
  assert(!JSON.stringify(calls[1].body).includes("SENSITIVE_UPSTREAM_DETAIL_SENTINEL"));
});
