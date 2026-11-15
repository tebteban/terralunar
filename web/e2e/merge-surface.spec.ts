import {test,expect} from '@playwright/test'
import {openSurface} from './helpers'

test('Luna funciona con token obsoleto y lleva el punto al buscador',async({page})=>{
 test.slow()
 await page.addInitScript(()=>localStorage.setItem('terralunar.cesium-token','obsolete-test-token'))
 const ion:string[]=[];page.on('request',r=>{if(r.url().includes('cesium.com'))ion.push(r.url())})
 await page.goto('/#explorar')
 await page.getByRole('navigation',{name:'Cuerpo visualizado'}).getByRole('button',{name:'Luna',exact:true}).click()
 const panel=await openSurface(page,'Ficha de la Luna')
 await panel.getByRole('button',{name:'Mons Mouton',exact:true}).click()
 await expect(panel.getByRole('heading',{name:'Punto elegido en la Luna'})).toBeVisible()
 await panel.getByRole('button',{name:'Buscar análogos de esta región'}).click()
 await expect(page.getByRole('heading',{name:'Comparar entornos de misión'})).toBeVisible()
 expect(ion).toEqual([])
})

test('fichas comparten layout sin desborde y Marte conserva selector y ensayos',async({page})=>{
 await page.goto('/#marte')
 const panel=await openSurface(page,'Ficha de Marte')
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
