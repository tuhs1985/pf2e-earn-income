import { readFileSync } from 'node:fs';
import ts from 'typescript';
const cache = new Map();
export function loadUtility(name) {
 if (cache.has(name)) return cache.get(name);
 const module = { exports: {} }; cache.set(name, module.exports);
 const source = readFileSync(new URL(`../src/utils/${name}.ts`, import.meta.url), 'utf8');
 const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
 new Function('require', 'module', 'exports', outputText)(path => loadUtility(path.replace('./', '')), module, module.exports);
 return module.exports;
}
