import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const blob=vi.hoisted(()=>({head:vi.fn(),get:vi.fn(),put:vi.fn()}));
vi.mock('@vercel/blob',()=>({...blob,BlobNotFoundError:class BlobNotFoundError extends Error{}}));
import {BlobNotFoundError} from '@vercel/blob';
import {defaultSiteContent} from '@/lib/siteContent';
import {readSiteContent,saveSiteContent} from '@/server/siteContentRepository';
describe('published content consistency',()=>{
 beforeEach(()=>{vi.stubEnv('BLOB_STORE_ID','content-test');vi.clearAllMocks();});
 afterEach(()=>vi.unstubAllEnvs());
 it('reads a new public CDN version immediately after an edit',async()=>{
  const updated={...defaultSiteContent,heroTitle:'新的首頁標題'};
  const url='https://example.public.blob.vercel-storage.com/content/site-content.json';
  let etag='first';
  blob.head.mockImplementation(async()=>({url,etag,uploadedAt:new Date('2026-11-23T00:00:00Z')}));
  blob.get.mockImplementation(async(value:string)=>({statusCode:200,stream:new Response(JSON.stringify(new URL(value).searchParams.get('v')==='second'?updated:defaultSiteContent)).body}));
  expect((await readSiteContent()).heroTitle).toBe(defaultSiteContent.heroTitle);
  etag='second';
  expect((await readSiteContent()).heroTitle).toBe('新的首頁標題');
 });
 it('keeps one editable pathname and bounds legacy CDN caching',async()=>{
  blob.put.mockResolvedValue({});await saveSiteContent(defaultSiteContent);
  expect(blob.put).toHaveBeenCalledWith('content/site-content.json',expect.any(String),expect.objectContaining({access:'public',addRandomSuffix:false,allowOverwrite:true,cacheControlMaxAge:60}));
 });
 it('uses the approved four campaigns when a store has no content yet',async()=>{
  blob.head.mockRejectedValue(new BlobNotFoundError());
  expect((await readSiteContent()).promotions.map(p=>p.id)).toEqual(['product-selection-v3','autoship-v3','pet-survey-v3','feedback-survey-v3']);
 });
});
