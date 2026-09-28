import assert from 'node:assert/strict';
import test from 'node:test';
import { loadUtility } from './loadUtility.mjs';
const l = loadUtility('sheetLayout'), t = loadUtility('sheetTemplates'), p = loadUtility('characterProfiles');
const { formatSheetRow } = loadUtility('sheetOutput');
const e = loadUtility('earnIncome');
const input = { character:'Alice',endDate:'2026-03-09',days:3,description:'Work',skill:'Lore',taskLevel:1,proficiency:'trained',counts:{criticalSuccess:0,success:3,failure:0,criticalFailure:0},rollsLink:'',hasExperiencedProfessional:false };
test('Earn Income mapping uses end date, task DC, numeric total income and inclusive local start date',()=>{
 const values = formatSheetRow(input).split('\t');
 assert.equal(values[0],'Earn Income'); assert.equal(values[1],input.endDate);
 assert.equal(values[6],String(e.taskDC(1))); assert.equal(values[10],String(e.totalEarnings(1,'trained',input.counts)/100));
 assert.equal(values[14],'2026-03-07'); assert.equal(values[8],'');
 assert.deepEqual(l.defaultSheetLayout().filter(c=>c.enabled).map(c=>c.label),['Activity','Date','Character','Description','Status','Task Level','DC Mod','DC','Assured?','Roll Result']);
});
test('single checks and mixed Assurance checks retain meaningful totals and methods',()=>{
 const check={...e.newCheck(1),method:'assurance',total:'17'};
 let cells=formatSheetRow(input,[check]).split('\t'); assert.equal(cells[7],'TRUE');assert.equal(cells[8],'17');
 cells=formatSheetRow(input,[check,{...check,method:'total'}]).split('\t');assert.equal(cells[7],'Mixed');assert.equal(cells[8],'');
});
test('single-period and Experienced Professional income match summary math',()=>{
 const data={...input,applyOneResultToAllDays:true,hasExperiencedProfessional:true,counts:{criticalSuccess:0,success:0,failure:0,criticalFailure:1}};
 assert.equal(formatSheetRow(data).split('\t')[10],String(e.totalEarnings(1,'trained',{...data.counts,criticalFailure:3},true)/100));
});
test('text and headers cannot become formulas; numeric negatives remain numeric',()=>{
 for(const text of ['=SUM(A1)','+1','-1','@x','\t=1']) assert.ok(l.safeSheetCell(text).startsWith("'"));
 assert.equal(l.safeSheetCell('a\tb\nc'),'a b c');assert.equal(l.safeSheetCell(-1),'-1');
 const columns=l.defaultSheetLayout().map(c=>({...c,enabled:c.id===10,negative:c.id===10?true:undefined}));
 assert.equal(l.formatLayoutRow(formatSheetRow(input),columns),'-0.6');
 assert.equal(l.formatLayoutRow(Array(15).fill('').join('\t'),columns),'');
 assert.equal(l.formatLayoutRow(Array(15).fill('0').join('\t'),columns),'0');
 columns.find(c=>c.id===10).label='=Danger';assert.ok(l.formatLayoutWithHeaders(formatSheetRow(input),columns).startsWith("'=Danger\n"));
});
test('blank columns preserve empty cells and headers through reorder and round trip',()=>{
 const columns=[{id:'blank-1',label:'',enabled:true},...l.defaultSheetLayout()];
 assert.deepEqual(l.parseSheetLayout(l.serializeSheetLayout(columns)),columns);
 assert.ok(l.formatLayoutWithHeaders(formatSheetRow(input),columns).startsWith('\tActivity'));
 assert.ok(l.formatLayoutRow(formatSheetRow(input),columns).startsWith('\tEarn Income'));
});
test('strict layout validation rejects malformed, duplicate, executable and foreign data',()=>{
 for(const value of [null,{},[],l.defaultSheetLayout().map(c=>({...c,enabled:false})),[...l.defaultSheetLayout(),{id:0,label:'duplicate',enabled:true}],l.defaultSheetLayout().map(c=>({...c,negative:true}))]) assert.throws(()=>l.validateSheetLayout(value));
 for(const text of ['(()=>alert(1))()','null','{}',JSON.stringify({app:'pf2e-crafting',version:1,columns:l.defaultSheetLayout()})]) assert.throws(()=>l.parseSheetLayout(text));
});
test('templates preserve edits, enforce limits, and migrate legacy layouts',()=>{
 let settings=t.loadSheetSettings();settings.layout=settings.layout.map(c=>c.id===0?{...c,label:'Job'}:c);
 assert.equal(t.sheetSettingsDirty(settings),true);settings=t.savedSheetSettings(settings,'Campaign');assert.equal(settings.active,'Campaign');assert.equal(t.sheetSettingsDirty(settings),false);
 assert.equal(t.loadSheetSettings({sheetLayout:settings.layout}).templates[0].name,'Default');
 assert.throws(()=>t.savedSheetSettings(settings,'campaign'));assert.throws(()=>t.savedSheetSettings(settings,''));
 for(let i=2;i<10;i++)settings=t.savedSheetSettings(settings,`T${i}`);
 assert.throws(()=>t.savedSheetSettings(settings,'eleven'));
 const profile={name:'Alice',skills:[{name:'Lore',modifier:5,proficiency:'trained',experienced:false}],selectedSkill:0,sheetTemplates:settings.templates,activeSheetTemplate:settings.active};
 const restored=p.parseProfiles(p.serializeProfiles([profile]))[0];assert.equal(restored.sheetTemplates.length,10);assert.equal(restored.activeSheetTemplate,settings.active);
 assert.throws(()=>p.validateProfile({...profile,activeSheetTemplate:'Missing'}));
});

test('DC adjustments affect all check methods, summary and sheet without changing payout rates',()=>{
 for(const adjustment of [-10,-5,-2,0,2,5,10]) assert.equal(e.taskDC(1,adjustment),15+adjustment);
 const check={...e.newCheck(1),method:'total',total:'15'};
 assert.equal(e.resolveCheck(check,1,2).result,'failure');
 assert.equal(e.resolveCheck({...check,method:'assurance'},1,2).result,'failure');
 assert.equal(e.resolveCheck({...check,natural:'20'},1,2).result,'success');
 assert.equal(e.resolveCheck({...check,method:'rolled',die:'10',modifier:'5'},1,-2).result,'success');
 assert.equal(e.checkCounts([check],1,3,2).failure,3);
 const data={...input,dcAdjustment:1};
 assert.equal(formatSheetRow(data).split('\t')[6],'16');
 assert.equal(formatSheetRow(data).split('\t')[15],'1');
 assert.equal(formatSheetRow(data).split('\t')[10],formatSheetRow(input).split('\t')[10]);
 assert.match(e.buildDiscordSummary(data),/\*\*DC\*\* 16/);
 for(const adj of [NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER]) assert.throws(()=>e.taskDC(1,adj));
});

test('DC Mod uses difficulty text or the supplied manual amount',()=>{
 assert.equal(formatSheetRow({...input,dcAdjustment:2,dcAdjustmentLabel:'Hard'}).split('\t')[15],'Hard');
 assert.equal(formatSheetRow({...input,dcAdjustment:-1,dcAdjustmentLabel:-1}).split('\t')[15],'-1');
 assert.equal(formatSheetRow(input).split('\t')[15],'');
});

test('optional numeric DC Adjustment defaults hidden and supports negative formatting',()=>{
 const layout=l.defaultSheetLayout();
 assert.equal(layout.find(c=>c.id===16).enabled,false);
 assert.equal(formatSheetRow({...input,dcAdjustment:-3,dcAdjustmentLabel:'Easy'}).split('\t')[16],'-3');
 const numeric=layout.map(c=>({...c,enabled:c.id===16,...(c.id===16?{negative:true}:{})}));
 assert.equal(l.formatLayoutRow(formatSheetRow({...input,dcAdjustment:3}),numeric),'-3');
});
