import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const blob=vi.hoisted(()=>({head:vi.fn(),get:vi.fn()}));
const storage=vi.hoisted(()=>({findUnique:vi.fn(),upsert:vi.fn()}));
vi.mock('@/server/db',()=>({db:{outboxEvent:storage}}));
vi.mock('@vercel/blob',()=>({...blob,BlobNotFoundError:class BlobNotFoundError extends Error{}}));
import {BlobNotFoundError} from '@vercel/blob';
import {defaultSiteContent} from '@/lib/siteContent';
import {readSiteContent,saveSiteContent} from '@/server/siteContentRepository';
describe('published content consistency',()=>{
 beforeEach(()=>{vi.stubEnv('VERCEL','1');vi.stubEnv('BLOB_STORE_ID','content-test');vi.clearAllMocks();storage.findUnique.mockResolvedValue(null);});
 afterEach(()=>vi.unstubAllEnvs());
 it('reads saved content instead of a stale public Blob copy',async()=>{
  const updated={...defaultSiteContent,heroTitle:'新的首頁標題'};
  storage.findUnique.mockResolvedValue({payload:updated});
  expect((await readSiteContent()).heroTitle).toBe('新的首頁標題');
  expect(blob.get).not.toHaveBeenCalled();
 });
 it('makes completed writes immediately readable from durable storage',async()=>{
  let saved:unknown=null;
  storage.upsert.mockImplementation(async input=>{saved={payload:input.update.payload};return saved;});
  storage.findUnique.mockImplementation(async()=>saved);
  const updated={...defaultSiteContent,heroTitle:'已儲存的新標題',promotionIntervalSeconds:7};
  await saveSiteContent(updated);
  const result=await readSiteContent();
  expect(result.heroTitle).toBe(updated.heroTitle);expect(result.promotionIntervalSeconds).toBe(7);
  expect(result.promotions).toEqual(updated.promotions);
 });
 it('uses the approved four campaigns when a store has no content yet',async()=>{
  blob.head.mockRejectedValue(new BlobNotFoundError());
  expect((await readSiteContent()).promotions.map(p=>p.id)).toEqual(['product-selection-v3','autoship-v3','pet-survey-v3','feedback-survey-v3']);
 });
});
