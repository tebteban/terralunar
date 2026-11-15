import unittest
from stac_catalogue import search_pages
URL='https://example.org/search'
def feature(i,date):return {'id':i,'collection':'s2','properties':{'datetime':date}}
class Pages(unittest.TestCase):
 def test_post_merge_and_dedup(self):
  calls=[]
  def request(url,body):
   calls.append(body)
   if len(calls)==1:return {'features':[feature('a','2026-01-01')],'links':[{'rel':'next','href':URL,'method':'POST','body':{'token':'x'},'merge':True}]}
   return {'features':[feature('a','2026-01-01'),feature('b','2026-02-01')]}
  items,meta=search_pages(request,URL,{'limit':100});self.assertEqual([i['id'] for i in items],['b','a']);self.assertEqual(calls[1],{'limit':100,'token':'x'});self.assertFalse(meta['truncated'])
 def test_limit(self):
  _,meta=search_pages(lambda *_:{'features':[],'links':[{'rel':'next','href':'?page=2'}]},URL,{},1);self.assertTrue(meta['truncated'])
 def test_get(self):
  calls=[]
  def req(url,body):
   calls.append((url,body));return {'features':[],'links':[{'rel':'next','href':'?page=2'}]} if len(calls)==1 else {'features':[]}
  search_pages(req,URL,{});self.assertEqual(calls[1],(URL+'?page=2',None))
 def test_loop(self):
  with self.assertRaises(ValueError):search_pages(lambda *_:{'features':[],'links':[{'rel':'next','href':URL,'method':'POST','body':{}}]},URL,{})
 def test_host(self):
  with self.assertRaises(ValueError):search_pages(lambda *_:{'features':[],'links':[{'rel':'next','href':'https://other.org'}]},URL,{})
if __name__=='__main__':unittest.main()
