import {test,expect} from '@playwright/test';
import {createMemberFixture} from './helpers/memberV2';
test('人像選單能在會員中心內切換到任務與遊戲',async({page})=>{
 test.skip(!process.env.PURESPOT_ADMIN_TEST_PASSWORD,'需要後台測試密碼');test.setTimeout(120000);
 await createMemberFixture(page.request);await page.goto('/account?tab=membership');
 await expect(page.getByRole('heading',{name:'我的會員權益',exact:true})).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'會員選單',exact:true}).click();await page.getByRole('menuitem',{name:'簽到與任務',exact:true}).click();
 await expect(page.getByRole('heading',{name:'簽到與任務',exact:true})).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'會員選單',exact:true}).click();await page.getByRole('menuitem',{name:'遊戲室',exact:true}).click();
 await expect(page.getByRole('heading',{name:'毛孩遊戲室',exact:true})).toBeVisible({timeout:20000});
});
