import {test,expect} from '@playwright/test'

test('Luna funciona con token obsoleto y conserva el recorte terrestre y formato común',async({page})=>{
 test.slow()
 await page.addInitScript(()=>localStorage.setItem('terralunar.cesium-token','obsolete-test-token'))
 const ion:string[]=[];page.on('request',r=>{if(r.url().includes('cesium.com'))ion.push(r.url())})
 await page.goto('/#explorar')
 await page.getByRole('navigation',{name:'Cuerpo visualizado'}).getByRole('button',{name:'Luna',exact:true}).click()
 const panel=page.getByRole('complementary',{name:'Ficha de la Luna'})
 await expect(panel).toBeVisible()
 await panel.getByRole('button',{name:'Mons Mouton',exact:true}).click()
 await expect(panel.getByRole('button',{name:'Ver en la Tierra'}).first()).toBeVisible()
 await panel.getByRole('button',{name:'Comparar relieve 3D'}).first().click()
 const comparison=page.getByRole('dialog',{name:'Comparador de relieve planetario y terrestre'})
 await expect(comparison).toBeVisible();await expect(comparison.getByLabel('Exageración vertical')).toBeVisible()
 await comparison.getByRole('button',{name:/Cerrar/}).click()
 await panel.getByRole('button',{name:'Ver en la Tierra'}).first().click()
 await expect(page.getByRole('complementary',{name:'Ficha del recorte terrestre'})).toBeVisible()
 expect(ion).toEqual([])
})

test('fichas comparten layout sin desborde y Marte conserva selector y ensayos',async({page})=>{
 await page.goto('/#marte')
 const panel=page.getByRole('complementary',{name:'Ficha de Marte'})
 await expect(panel).toBeVisible()
 await expect(panel.getByLabel('Destino marciano')).toBeVisible()
 for(const width of [390,768,1100,1440]){
  await page.setViewportSize({width,height:900})
  await expect(panel).toBeVisible()
  const extent=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth])
  expect(extent[0]).toBeLessThanOrEqual(extent[1])
  const nav=await page.getByRole('navigation',{name:'Cuerpo visualizado'}).boundingBox(),box=await panel.boundingBox()
  expect(box!.y).toBeGreaterThanOrEqual(nav!.y+nav!.height)
 }
})
