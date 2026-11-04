t=open('template.html').read(); b=open('engine.bundle.js').read().replace('</script','<\\/script')
open('demo.html','w').write(t.replace('__BUNDLE__',b))
