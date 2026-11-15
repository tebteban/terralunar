"""Bounded STAC traversal; injectable transport for offline tests."""
import json
from urllib.parse import urljoin,urlparse

def search_pages(request,url,query,max_pages=10):
 if not isinstance(max_pages,int) or not 1<=max_pages<=100:raise ValueError('Invalid page limit')
 original=urlparse(url);body=dict(query);seen_requests=set();items={};pages=0;truncated=False
 while True:
  key=(url,json.dumps(body,sort_keys=True))
  if key in seen_requests:raise ValueError('Repeated STAC pagination cursor')
  seen_requests.add(key)
  data=request(url,body)
  if not isinstance(data.get('features'),list):raise ValueError('Invalid STAC response')
  pages+=1
  for feature in data['features']:
   ident=(feature.get('collection'),feature['id']);items.setdefault(ident,feature)
  link=next((l for l in data.get('links',[]) if l.get('rel')=='next'),None)
  if not link:break
  if pages>=max_pages:truncated=True;break
  next_url=urljoin(url,link['href']);parsed=urlparse(next_url)
  if parsed.scheme!=original.scheme or parsed.netloc!=original.netloc:raise ValueError('Unexpected pagination host')
  method=link.get('method','GET').upper()
  if method not in ('GET','POST'):raise ValueError('Unsupported pagination method')
  if method=='POST':body={**(body or {}),**link.get('body',{})} if link.get('merge',False) else link.get('body',{})
  else:body=None
  url=next_url
 result=list(items.values());result.sort(key=lambda f:(f['properties']['datetime'],f['id']),reverse=True)
 return result,{'pages':pages,'max_pages':max_pages,'returned_unique':len(result),'truncated':truncated}
