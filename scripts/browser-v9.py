"""Exercise genuine v0.9 birth-to-adult checkpoints through visible phone controls."""
import importlib.util
import json
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

project=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('v9_helpers',project/'scripts/browser-dark-ui.py')
ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
fixtures=json.loads((project/'.local/v9-checkpoints.json').read_text())
selected=[f for f in fixtures if not f['name'].startswith('childhood-') or f['name'] in ('childhood-6','childhood-12','childhood-16')]
errors=[];outputs={};blocked=[];clicks=[]
with tempfile.TemporaryDirectory(prefix='hearth-v9-ui-') as temp, sync_playwright() as pw:
    directory=Path(temp)
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for edition in ('online','offline'):
        context=browser.new_context(viewport={'width':390,'height':844})
        page=context.new_page();page.set_default_timeout(10000)
        page.on('pageerror',lambda error:errors.append(str(error)))
        address=ui.url+('hearth-and-oath.html' if edition=='offline' else '')
        if edition=='offline':
            def isolated(route):
                if route.request.url==address:route.continue_()
                else:blocked.append(route.request.url);route.abort()
            page.route('**/*',isolated)
        page.goto(address,wait_until='load');outputs[edition]={}
        for width in (390,1440):
            page.set_viewport_size({'width':width,'height':844 if width==390 else 1000})
            for fixture in selected:
                name=f"{width}/{fixture['name']}"
                ui.import_life(page,directory,edition+'-'+fixture['name'],fixture['state'])
                ui.view(page,fixture['view']);ui.no_overflow(page,name);ui.touch_controls(page,name)
                before=ui.state(page)
                if before['event']:
                    ui.view(page,'life');pick=before['event']['choices'][0]['id'];ui.click(page,'choice',pick)
                    clicks.append({'edition':edition,'name':name,'choice':pick})
                elif fixture['view']=='map':
                    target=next(p['id'] for p in before['world']['locations'] if p['id']!=before['locationId'])
                    page.locator(f'.map-node[data-id="{target}"]').first.click()
                    assert ui.state(page)==before,'Selecting a map destination must not advance life'
                    assert page.locator('.map-inspector').is_visible()
                    clicks.append({'edition':edition,'name':name,'destination':target})
                else:
                    prefix='social_' if fixture['view']=='relationships' else 'pastime_'
                    action=page.locator(f'[data-op="activity"][data-id^="{prefix}"]:not([disabled])').first
                    if action.count():
                        for ancestor in action.locator('xpath=ancestor::details[not(@open)]').all():ancestor.locator('summary').first.click()
                        action.click();clicks.append({'edition':edition,'name':name,'activity':action.get_attribute('data-id') if action.count() else prefix})
                after=ui.state(page);page.reload(wait_until='load')
                if page.locator('[data-op="resume"]:visible').count():ui.click(page,'resume')
                assert ui.state(page)==after,name+': reload changed the chosen state'
                ui.no_overflow(page,name+'-after');outputs[edition][name]=after
                if width==390 and fixture['view'] in ('map','relationships','activities'):
                    ui.view(page,fixture['view']);page.screenshot(path=str(ui.artifacts/('v9-'+edition+'-'+fixture['name']+'.png')),full_page=True)
        context.close()
    browser.close()
assert outputs['online']==outputs['offline'],'Online and isolated offline choices must agree exactly'
assert not errors,errors
assert not blocked,blocked
result={'checkpoints':len(selected),'responsiveChecks':len(selected)*4,'controlsClicked':len(clicks),'widths':[390,1440],'exactOnlineOfflineParity':True,'javascriptErrors':errors,'externalOfflineRequests':blocked,'checkpointNames':[f['name'] for f in selected]}
(project/'docs/playtest/v9-browser.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
